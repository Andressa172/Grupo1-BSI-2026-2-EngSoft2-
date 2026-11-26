// Model - DoacaoProduto (RF_F3 - Receber doação de produto)
// Mantém a lista de itens, valida os próprios atributos e persiste criando o DAO
// com a conexão que recebe do Controller (dentro de uma transação).
import type { ErrosDeCampo } from '../erros';
import type { ExecutorSQL } from '../dao/tipos';
import { DoacaoProdutoDAO, type DoacaoProdutoRegistro } from '../dao/DoacaoProdutoDAO';
import type { FiltroDoacao } from './FiltroDoacao';
import type { ItemDoacao } from './ItemDoacao';
import { dataValida, hoje, paraIso, parseData } from './datasBR';

export type { FiltroDoacaoAtributos } from './FiltroDoacao';
export type { DoacaoProdutoRegistro } from '../dao/DoacaoProdutoDAO';

export interface DoacaoProdutoAtributos {
  dataRecebimento: string; // dd/mm/aaaa
  itens: unknown;
}

export const MAXIMO_ITENS = 100;

export class DoacaoProduto {
  private id?: number;
  private readonly dataRecebimento: Date;
  private readonly itens: ItemDoacao[];
  private readonly itensRecebidosEmFormatoInvalido: boolean;

  // o Controller cria os ItemDoacao (Model não instancia Model) e entrega a lista pronta
  constructor(atributos: Partial<DoacaoProdutoAtributos>, itens: ItemDoacao[] = []) {
    this.dataRecebimento = parseData(atributos.dataRecebimento);
    this.itensRecebidosEmFormatoInvalido = atributos.itens !== undefined && !Array.isArray(atributos.itens);
    this.itens = itens;
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
    const erros: ErrosDeCampo = {};

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
   * Grava a doação do doador já resolvido pelo Controller. Os itens e a entrada no estoque (RF_F1)
   * também ficam a cargo do Controller. Chamar dentro de uma transação (tudo grava ou nada grava).
   */
  async incluir(conexao: ExecutorSQL, doadorId: number): Promise<void> {
    this.id = await new DoacaoProdutoDAO().inserirDoacao(conexao, doadorId, paraIso(this.dataRecebimento));
  }

  /** Grava um item da doação. O Controller chama depois de dar a entrada dele no estoque. */
  async incluirItem(conexao: ExecutorSQL, item: ItemDoacao): Promise<void> {
    const validade = item.getDataValidade();
    await new DoacaoProdutoDAO().inserirItem(
      conexao,
      this.id!,
      item.getProdutoId(),
      item.getQuantidade(),
      validade ? paraIso(validade) : null
    );
  }

  static async consultar(conexao: ExecutorSQL, filtro: FiltroDoacao): Promise<DoacaoProdutoRegistro[]> {
    return new DoacaoProdutoDAO().consultar(conexao, {
      doadorId: filtro.getDoadorId(),
      somenteAnonimos: filtro.isSomenteAnonimos(),
      dataInicialIso: filtro.getDataInicial(),
      dataFinalIso: filtro.getDataFinal(),
    });
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
