// Model - DoacaoProduto (RF_F3 - Receber doação de produto)
// Mantém a lista de itens, valida os próprios atributos e persiste criando o DAO
// com a conexão que recebe do Controller (dentro de uma transação).
import type { ErrosDeCampo } from '../erros';
import type { ExecutorSQL } from '../dao/tipos';
import { DoacaoProdutoDAO, type DoacaoProdutoRegistro } from '../dao/DoacaoProdutoDAO';
import type { FiltroDoacao } from './FiltroDoacao';
import { ItemDoacao } from './ItemDoacao';
import { SelecaoDoador } from './SelecaoDoador';
import { dataValida, hoje, paraIso, parseData } from './datasBR';

export interface DoacaoProdutoAtributos {
  doador: unknown;
  dataRecebimento: string; // dd/mm/aaaa
  itens: unknown;
}

const MAXIMO_ITENS = 100;

export class DoacaoProduto {
  private id?: number;
  private readonly doador: SelecaoDoador;
  private readonly dataRecebimento: Date;
  private readonly itens: ItemDoacao[];
  private readonly itensRecebidosEmFormatoInvalido: boolean;

  constructor(atributos: Partial<DoacaoProdutoAtributos>) {
    this.doador = new SelecaoDoador(atributos.doador);
    this.dataRecebimento = parseData(atributos.dataRecebimento);
    this.itensRecebidosEmFormatoInvalido = atributos.itens !== undefined && !Array.isArray(atributos.itens);
    this.itens = Array.isArray(atributos.itens) ? atributos.itens.slice(0, MAXIMO_ITENS + 1).map((i) => new ItemDoacao(i)) : [];
  }

  getId(): number | undefined {
    return this.id;
  }

  getItens(): readonly ItemDoacao[] {
    return this.itens;
  }

  getDataRecebimento(): Date {
    return this.dataRecebimento;
  }

  validar(): ErrosDeCampo {
    const erros: ErrosDeCampo = { ...this.doador.validar() };

    if (!dataValida(this.dataRecebimento)) {
      erros.dataRecebimento = 'Data de recebimento inválida: use o formato dd/mm/aaaa.';
    } else if (this.dataRecebimento.getTime() > hoje().getTime()) {
      erros.dataRecebimento = 'Data de recebimento inválida: não pode ser uma data futura.';
    }

    if (this.itensRecebidosEmFormatoInvalido || this.itens.length === 0) {
      erros.itens = 'Informe ao menos um item da doação.';
    } else if (this.itens.length > MAXIMO_ITENS) {
      erros.itens = `Uma doação pode ter no máximo ${MAXIMO_ITENS} itens.`;
    } else {
      this.itens.forEach((item, i) => {
        const errosItem = item.validar(this.dataRecebimento);
        for (const campo of Object.keys(errosItem)) erros[`item.${i}.${campo}`] = errosItem[campo];
      });
    }
    return erros;
  }

  // ------------------------------ persistência ------------------------------

  /**
   * Grava a doação (os itens e a entrada no estoque, RF_F1, ficam a cargo do Controller).
   * Deve ser chamado dentro de uma transação: se qualquer passo falhar, nada fica gravado.
   */
  async incluir(conexao: ExecutorSQL): Promise<void> {
    const doadorId = await this.doador.obterId(conexao);
    const dao = new DoacaoProdutoDAO(conexao);
    this.id = await dao.inserirDoacao(doadorId, paraIso(this.dataRecebimento));
  }

  /** Grava um item da doação. Chamado pelo Controller, item a item, depois da entrada no estoque. */
  async incluirItem(conexao: ExecutorSQL, item: ItemDoacao): Promise<void> {
    await new DoacaoProdutoDAO(conexao).inserirItem(this.id!, item);
  }

  static async consultar(conexao: ExecutorSQL, filtro: FiltroDoacao): Promise<DoacaoProdutoRegistro[]> {
    return new DoacaoProdutoDAO(conexao).consultar(filtro);
  }

  paraLinhaDeDados() {
    return {
      id: this.id,
      dataRecebimento: paraIso(this.dataRecebimento),
      itens: this.itens.map((i) => ({
        produtoId: i.getProdutoId(),
        quantidade: i.getQuantidade(),
        dataValidade: i.getDataValidade() ? paraIso(i.getDataValidade() as Date) : null,
      })),
    };
  }
}
