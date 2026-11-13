// Control - CriarCardapioController (RF_F10)
import { Database } from './db/Database';
import { CardapioDiario, type TipoRefeicao } from './model/CardapioDiario';
import { ItemCardapio } from './model/ItemCardapio';
import { CardapioDiarioDAO } from './dao/CardapioDiarioDAO';
import { ItemCardapioDAO } from './dao/ItemCardapioDAO';
import { MovimentacaoEstoque } from './model/MovimentacaoEstoque';
import { ErroRegraDeNegocio, ErroValidacao } from './erros';
import type { ExecutorSQL } from './dao/tipos';

export interface DadosNovoCardapio {
  data: string;
  tipoRefeicao: TipoRefeicao;
  criadoPor?: number | null;
}

export interface DadosItemCardapio {
  produtoId: number;
  quantidadeUtilizada: number;
}

export interface ResultadoCardapio {
  cardapio: ReturnType<CardapioDiario['paraLinhaDeDados']>;
  itens: ReturnType<ItemCardapio['paraLinhaDeDados']>[];
}

export interface ICardapioDAOParaCriacao {
  inserir(cardapio: CardapioDiario): Promise<CardapioDiario>;
}

export interface IConsultaDuplicidadeCardapio {
  existeParaDataETipo(data: string, tipoRefeicao: TipoRefeicao): Promise<boolean>;
}
export interface IItemCardapioDAOParaCriacao {
  inserir(item: ItemCardapio): Promise<ItemCardapio>;
}
// baixa no estoque (RF_F1): devolve false se não há saldo suficiente
export interface IEstoqueParaCardapio {
  registrarSaida(produtoId: number, quantidade: number, origem: string): Promise<boolean>;
}

const globalParaSingleton = globalThis as unknown as { criarCardapioController?: CriarCardapioController };

export class CriarCardapioController {
  constructor(
    private readonly database: Pick<Database, 'comTransacao'> = Database.getInstancia(),
    private readonly criarCardapioDAO: (executor: ExecutorSQL) => ICardapioDAOParaCriacao = (executor) =>
      new CardapioDiarioDAO(executor),
    private readonly criarItemCardapioDAO: (executor: ExecutorSQL) => IItemCardapioDAOParaCriacao = (executor) =>
      new ItemCardapioDAO(executor),
    private readonly criarEstoque: (executor: ExecutorSQL) => IEstoqueParaCardapio = (executor) => ({
      registrarSaida: (produtoId, quantidade, origem) =>
        MovimentacaoEstoque.registrarSaida(executor, produtoId, quantidade, origem),
    }),
    private readonly cardapioDAOSomenteLeitura: IConsultaDuplicidadeCardapio = new CardapioDiarioDAO()
  ) {}

  static getInstancia(): CriarCardapioController {
    if (!globalParaSingleton.criarCardapioController) {
      globalParaSingleton.criarCardapioController = new CriarCardapioController();
    }
    return globalParaSingleton.criarCardapioController;
  }

  async criarCardapioDiario(dadosCardapio: DadosNovoCardapio, itens: DadosItemCardapio[]): Promise<ResultadoCardapio> {
    if (!itens || itens.length === 0) {
      throw new ErroValidacao('É necessário incluir ao menos um alimento no cardápio.');
    }

    const cardapio = new CardapioDiario(dadosCardapio);
    cardapio.validar();

    if (await this.cardapioDAOSomenteLeitura.existeParaDataETipo(cardapio.getData(), cardapio.getTipoRefeicao())) {
      throw new ErroValidacao('Já existe um cardápio cadastrado para esta data e tipo de refeição.');
    }

    const modelosItem = itens.map((dadosItem) => {
      const item = new ItemCardapio(dadosItem);
      item.validar();
      return item;
    });

    return this.database.comTransacao(async (client) => {
      const cardapioDAO = this.criarCardapioDAO(client as unknown as ExecutorSQL);
      const itemCardapioDAO = this.criarItemCardapioDAO(client as unknown as ExecutorSQL);
      const estoque = this.criarEstoque(client as unknown as ExecutorSQL);

      const cardapioSalvo = await cardapioDAO.inserir(cardapio);

      const itensSalvos: ItemCardapio[] = [];
      for (const item of modelosItem) {
        const atualizado = await estoque.registrarSaida(
          item.getProdutoId(),
          item.getQuantidadeUtilizada(),
          `Cardápio diário de ${cardapio.getData()} (${cardapio.getTipoRefeicao()})`
        );
        if (!atualizado) {
          throw new ErroRegraDeNegocio(
            `Estoque insuficiente para o alimento ${item.getProdutoId()}: não é possível usar ${item.getQuantidadeUtilizada()} unidade(s).`
          );
        }

        item.setCardapioId(cardapioSalvo.getId()!);
        itensSalvos.push(await itemCardapioDAO.inserir(item));
      }

      return {
        cardapio: cardapioSalvo.paraLinhaDeDados(),
        itens: itensSalvos.map((i) => i.paraLinhaDeDados()),
      };
    });
  }

  async listarCardapiosComItens(): Promise<ResultadoCardapio[]> {
    const cardapioDAO = new CardapioDiarioDAO();
    const itemCardapioDAO = new ItemCardapioDAO();
    const cardapios = await cardapioDAO.listarTodos();

    const resultado: ResultadoCardapio[] = [];
    for (const cardapio of cardapios) {
      const itens = await itemCardapioDAO.listarPorCardapio(cardapio.getId()!);
      resultado.push({
        cardapio: cardapio.paraLinhaDeDados(),
        itens: itens.map((i) => i.paraLinhaDeDados()),
      });
    }
    return resultado;
  }
}
