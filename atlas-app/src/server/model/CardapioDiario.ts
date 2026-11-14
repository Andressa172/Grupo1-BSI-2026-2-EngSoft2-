// Model - CardapioDiario (RF_F10 - Criar Cardápio Diário)
// Guarda o cardápio e os alimentos usados, valida tudo e persiste criando o CardapioDiarioDAO
// com a conexão que recebe do Controller (dentro de uma transação).
import type { ErrosDeCampo } from '../erros';
import { ErroNaoEncontrado, ErroValidacao } from '../erros';
import type { ExecutorSQL } from '../dao/tipos';
import { CardapioDiarioDAO, type CardapioRegistro, type ItemCardapioRegistrado } from '../dao/CardapioDiarioDAO';
import type { FiltroCardapio } from './FiltroCardapio';
import { ItemCardapio } from './ItemCardapio';
import { dataValida, parseData, paraIso, textoSeguro } from './datasBR';

export type TipoRefeicao = 'CAFE_DA_MANHA' | 'ALMOCO' | 'LANCHE' | 'JANTAR';
export const TIPOS_REFEICAO: TipoRefeicao[] = ['CAFE_DA_MANHA', 'ALMOCO', 'LANCHE', 'JANTAR'];

export interface CardapioDiarioAtributos {
  data: string; // dd/mm/aaaa
  tipoRefeicao: string;
  itens: unknown;
}

const MAXIMO_ITENS = 50;

export class CardapioDiario {
  private id?: number;
  private readonly data: Date;
  private readonly tipoRefeicao: TipoRefeicao | '';
  private readonly itens: ItemCardapio[];
  private readonly itensEmFormatoInvalido: boolean;

  constructor(atributos: Partial<CardapioDiarioAtributos>) {
    this.data = parseData(atributos.data);
    const tipo = textoSeguro(atributos.tipoRefeicao);
    this.tipoRefeicao = (TIPOS_REFEICAO as readonly string[]).includes(tipo) ? (tipo as TipoRefeicao) : '';
    this.itensEmFormatoInvalido = atributos.itens !== undefined && !Array.isArray(atributos.itens);
    this.itens = Array.isArray(atributos.itens)
      ? atributos.itens.slice(0, MAXIMO_ITENS + 1).map((i) => new ItemCardapio(i))
      : [];
  }

  getId(): number | undefined {
    return this.id;
  }

  getData(): Date {
    return this.data;
  }

  getTipoRefeicao(): TipoRefeicao | '' {
    return this.tipoRefeicao;
  }

  getItens(): readonly ItemCardapio[] {
    return this.itens;
  }

  validar(): ErrosDeCampo {
    const erros: ErrosDeCampo = {};

    // data no passado é permitida (cadastro retroativo), a tela só avisa - não bloqueia
    if (!dataValida(this.data)) {
      erros.data = 'Data inválida: use o formato dd/mm/aaaa.';
    }

    if (this.tipoRefeicao === '') {
      erros.tipoRefeicao = 'Selecione o tipo de refeição.';
    }

    if (this.itensEmFormatoInvalido || this.itens.length === 0) {
      erros.itens = 'Informe ao menos um alimento no cardápio.';
    } else if (this.itens.length > MAXIMO_ITENS) {
      erros.itens = `Um cardápio pode ter no máximo ${MAXIMO_ITENS} itens.`;
    } else {
      this.itens.forEach((item, i) => {
        const errosItem = item.validar();
        for (const campo of Object.keys(errosItem)) erros[`item.${i}.${campo}`] = errosItem[campo];
      });
    }

    return erros;
  }

  // ------------------------------ persistência ------------------------------

  /** Grava o cardápio (os itens e a saída no estoque, RF_F1, ficam a cargo do Controller). Dentro de uma transação. */
  async incluir(conexao: ExecutorSQL): Promise<void> {
    const dao = new CardapioDiarioDAO(conexao);

    if (await dao.existeParaDataETipo(paraIso(this.data), this.tipoRefeicao as TipoRefeicao)) {
      throw new ErroValidacao('Cardápio duplicado.', {
        data: 'Já existe um cardápio cadastrado para esta data e tipo de refeição.',
      });
    }

    this.id = await dao.inserirCardapio(paraIso(this.data), this.tipoRefeicao as TipoRefeicao);
  }

  /**
   * Atualiza o cardápio e apaga os itens antigos. O Controller já estornou o estoque dos itens
   * antigos e registra os novos depois. Deve rodar dentro de uma transação.
   */
  async alterar(conexao: ExecutorSQL, id: number): Promise<void> {
    const dao = new CardapioDiarioDAO(conexao);
    if (!(await dao.existe(id))) {
      throw new ErroNaoEncontrado('Cardápio não encontrado.');
    }
    if (await dao.existeParaDataETipo(paraIso(this.data), this.tipoRefeicao as TipoRefeicao, id)) {
      throw new ErroValidacao('Cardápio duplicado.', {
        data: 'Já existe um cardápio cadastrado para esta data e tipo de refeição.',
      });
    }

    await dao.excluirItens(id);
    await dao.atualizarCardapio(id, paraIso(this.data), this.tipoRefeicao as TipoRefeicao);
    this.id = id;
  }

  /** Exclui o cardápio (cascata remove os itens). O Controller já estornou o estoque. */
  static async excluir(conexao: ExecutorSQL, id: number): Promise<void> {
    if (!(await new CardapioDiarioDAO(conexao).excluirCardapio(id))) {
      throw new ErroNaoEncontrado('Cardápio não encontrado.');
    }
  }

  /** Itens já gravados no cardápio, para o Controller estornar o estoque. */
  static async listarItens(conexao: ExecutorSQL, cardapioId: number): Promise<ItemCardapioRegistrado[]> {
    return new CardapioDiarioDAO(conexao).listarItens(cardapioId);
  }

  /** Origem registrada no histórico de estoque para as saídas deste cardápio. */
  getOrigemEstoque(): string {
    return `Cardápio diário de ${paraIso(this.data)} (${this.tipoRefeicao})`;
  }

  /** O cardápio só aceita produtos cadastrados da categoria Alimento. */
  async verificarItem(conexao: ExecutorSQL, item: ItemCardapio): Promise<'ok' | 'categoria' | 'produto'> {
    const categoria = await new CardapioDiarioDAO(conexao).buscarCategoriaProduto(item.getProdutoId());
    if (categoria === null) return 'produto';
    if (categoria !== 'Alimento') return 'categoria';
    return 'ok';
  }

  /** Grava um item do cardápio. Chamado pelo Controller, item a item, depois da saída no estoque. */
  async incluirItem(conexao: ExecutorSQL, item: ItemCardapio): Promise<void> {
    await new CardapioDiarioDAO(conexao).inserirItem(this.id!, item.getProdutoId(), item.getQuantidadeUtilizada());
  }

  static async consultar(conexao: ExecutorSQL, filtro: FiltroCardapio): Promise<CardapioRegistro[]> {
    return new CardapioDiarioDAO(conexao).consultar(filtro);
  }
}
