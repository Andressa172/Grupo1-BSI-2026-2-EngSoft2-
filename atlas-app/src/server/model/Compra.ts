// Model - Compra (RF_F2 - Lançar entrada de compras)
// Mantém a lista de itens, valida os próprios atributos e persiste criando o DAO
// com a conexão que recebe do Controller (dentro de uma transação).
import type { ErrosDeCampo } from '../erros';
import { ErroValidacao } from '../erros';
import type { ExecutorSQL } from '../dao/tipos';
import { CompraDAO, type CompraRegistro } from '../dao/CompraDAO';
import type { FiltroCompra } from './FiltroCompra';
import { ItemCompra } from './ItemCompra';
import { dataValida, hoje, paraIso, parseData, textoSeguro } from './datasBR';

export interface CompraAtributos {
  numeroNF: unknown;
  dataCompra: unknown; // dd/mm/aaaa
  fornecedor: unknown;
  itens: unknown;
}

const MAXIMO_ITENS = 100;
const TAMANHO_MAXIMO_NF = 60; // coluna compra.numero_nf
const TAMANHO_MAXIMO_FORNECEDOR = 120; // coluna compra.fornecedor
// NUMERIC(12, 2) guarda até 9.999.999.999,99
const VALOR_TOTAL_MAXIMO_EM_CENTAVOS = 999_999_999_999;
// número da nota: letras, números, espaço, ponto, hífen e barra (ex.: "000.123.456", "NF-e 1234/1")
const FORMATO_NF = /^[A-Z0-9][A-Z0-9 .\-/]*$/;
// sem caracteres de controle (quebra de linha, tab...) no nome do fornecedor
const CARACTERE_DE_CONTROLE = /[\u0000-\u001f\u007f]/;
export const MENSAGEM_NF_DUPLICADA = 'Nota fiscal já registrada: esta compra já foi lançada.';

export class Compra {
  private id?: number;
  private readonly numeroNF: string;
  private readonly dataCompra: Date;
  private readonly fornecedor: string;
  private readonly itens: ItemCompra[];
  private readonly itensRecebidosEmFormatoInvalido: boolean;

  constructor(atributos: Partial<CompraAtributos>) {
    // a nota é guardada sem espaços sobrando e em maiúsculas, para "nf 10" e "NF  10" serem a mesma
    this.numeroNF = textoSeguro(atributos.numeroNF).replace(/\s+/g, ' ').toUpperCase();
    this.dataCompra = parseData(atributos.dataCompra);
    this.fornecedor = textoSeguro(atributos.fornecedor).replace(/ {2,}/g, ' ');
    this.itensRecebidosEmFormatoInvalido = atributos.itens !== undefined && !Array.isArray(atributos.itens);
    this.itens = Array.isArray(atributos.itens) ? atributos.itens.slice(0, MAXIMO_ITENS + 1).map((i) => new ItemCompra(i)) : [];
  }

  getId(): number | undefined {
    return this.id;
  }

  getNumeroNF(): string {
    return this.numeroNF;
  }

  getItens(): readonly ItemCompra[] {
    return this.itens;
  }

  /** Passo 6: valor total da compra (soma dos itens), em reais. */
  getValorTotal(): number {
    return this.getValorTotalEmCentavos() / 100;
  }

  private getValorTotalEmCentavos(): number {
    return this.itens.reduce((soma, item) => soma + item.getValorTotalEmCentavos(), 0);
  }

  /** Passos 2 e 4 do fluxo básico e fluxos 1.1, 2.1 (formato da nota), 3.1, 4.1 e 5.1. */
  validar(): ErrosDeCampo {
    const erros: ErrosDeCampo = {};

    if (this.numeroNF === '') {
      erros.numeroNF = 'Informe o número da nota fiscal.';
    } else if (this.numeroNF.length > TAMANHO_MAXIMO_NF) {
      erros.numeroNF = `Nota fiscal inválida: no máximo ${TAMANHO_MAXIMO_NF} caracteres.`;
    } else if (!FORMATO_NF.test(this.numeroNF)) {
      erros.numeroNF = 'Nota fiscal inválida: use apenas letras, números, espaço, ponto, hífen ou barra.';
    }

    if (!dataValida(this.dataCompra)) {
      erros.dataCompra = 'Data da compra inválida: use o formato dd/mm/aaaa.';
    } else if (this.dataCompra.getTime() > hoje().getTime()) {
      erros.dataCompra = 'Data da compra inválida: não pode ser uma data futura.';
    }

    if (this.fornecedor.length < 2) {
      erros.fornecedor = 'Informe o fornecedor.';
    } else if (this.fornecedor.length > TAMANHO_MAXIMO_FORNECEDOR) {
      erros.fornecedor = `Fornecedor inválido: no máximo ${TAMANHO_MAXIMO_FORNECEDOR} caracteres.`;
    } else if (CARACTERE_DE_CONTROLE.test(this.fornecedor)) {
      erros.fornecedor = 'Fornecedor inválido: contém caracteres não permitidos.';
    }

    if (this.itensRecebidosEmFormatoInvalido || this.itens.length === 0) {
      erros.itens = 'Inclua ao menos um produto na compra.';
    } else if (this.itens.length > MAXIMO_ITENS) {
      erros.itens = `Uma compra pode ter no máximo ${MAXIMO_ITENS} itens.`;
    } else {
      this.itens.forEach((item, i) => {
        const errosItem = item.validar(this.dataCompra);
        for (const campo of Object.keys(errosItem)) erros[`item.${i}.${campo}`] = errosItem[campo];
      });
      if (Object.keys(erros).every((campo) => !campo.startsWith('item.')) && this.getValorTotalEmCentavos() > VALOR_TOTAL_MAXIMO_EM_CENTAVOS) {
        erros.itens = 'Valor total da compra acima do limite permitido.';
      }
    }
    return erros;
  }

  // ------------------------------ persistência ------------------------------

  /**
   * Passo 9: grava a compra (os itens e a entrada no estoque, RF_F1, ficam a cargo do Controller).
   * Deve ser chamado dentro de uma transação: se qualquer passo falhar, nada fica gravado (fluxo 9.1).
   */
  async incluir(conexao: ExecutorSQL): Promise<void> {
    const dao = new CompraDAO(conexao);
    try {
      this.id = await dao.inserirCompra(this.numeroNF, paraIso(this.dataCompra), this.fornecedor, this.getValorTotal());
    } catch (erro) {
      // 23505 = UNIQUE violado: outra pessoa lançou a mesma nota ao mesmo tempo
      // (depois da checagem do Controller e antes desta gravação)
      if ((erro as { code?: string }).code === '23505') {
        throw new ErroValidacao(MENSAGEM_NF_DUPLICADA, { numeroNF: MENSAGEM_NF_DUPLICADA });
      }
      throw erro;
    }
  }

  /** Grava um item da compra. Chamado pelo Controller, item a item, depois da entrada no estoque. */
  async incluirItem(conexao: ExecutorSQL, item: ItemCompra): Promise<void> {
    await new CompraDAO(conexao).inserirItem(this.id!, item);
  }

  /** Fluxo 2.1: já existe compra com esta nota fiscal? Quem decide o que fazer é o Controller. */
  async existeNotaFiscalIgual(conexao: ExecutorSQL): Promise<boolean> {
    return new CompraDAO(conexao).existeNotaFiscal(this.numeroNF);
  }

  static async consultar(conexao: ExecutorSQL, filtro: FiltroCompra): Promise<CompraRegistro[]> {
    return new CompraDAO(conexao).consultar(filtro);
  }

  paraLinhaDeDados() {
    return {
      id: this.id,
      numeroNF: this.numeroNF,
      dataCompra: paraIso(this.dataCompra),
      fornecedor: this.fornecedor,
      valorTotal: this.getValorTotal(),
      itens: this.itens.map((i) => ({
        produtoId: i.getProdutoId(),
        quantidade: i.getQuantidade(),
        valorUnitario: i.getValorUnitario(),
        dataValidade: i.getDataValidade() ? paraIso(i.getDataValidade() as Date) : null,
      })),
    };
  }
}
