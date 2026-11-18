// Control - CriarCardapioController (RF_F10 - Criar Cardápio Diário)
//
// - Não se auto-instancia: quem usa o Controller (a rota) cria com `new`.
// - Façade: a View (via rota /api/cardapios) só conhece estes métodos.
// - Abre e mantém a conexão com o banco (Database, Singleton), cria o Model CardapioDiario,
//   decide quando validar e persistir e controla a transação (tudo grava ou nada grava).
//   Quem cria o CardapioDiarioDAO é o Model; a saída/estorno no estoque (RF_F1) é feita pelo
//   Model (MovimentacaoEstoque), na mesma transação; nenhum Controller chama outro Controller.
import { Database } from './db/Database';
import type { ExecutorSQL } from './dao/tipos';
import { CardapioDiario, type CardapioDiarioAtributos } from './model/CardapioDiario';
import { FiltroCardapio, type FiltroCardapioAtributos } from './model/FiltroCardapio';
import type { CardapioRegistro } from './dao/CardapioDiarioDAO';
import { Produto } from './model/Produto';
import type { ProdutoLinha } from './dao/ProdutoDAO';
import { ErroValidacao, type ErrosDeCampo } from './erros';

const MENSAGEM_CAMPOS_INVALIDOS = 'Corrija os campos destacados.';

function lancarSeTiverErros(erros: ErrosDeCampo): void {
  if (Object.keys(erros).length > 0) {
    throw new ErroValidacao(MENSAGEM_CAMPOS_INVALIDOS, erros);
  }
}

function comoObjeto(dados: unknown): Partial<CardapioDiarioAtributos> {
  if (typeof dados !== 'object' || dados === null || Array.isArray(dados)) {
    throw new ErroValidacao('Dados inválidos.');
  }
  return dados as Partial<CardapioDiarioAtributos>;
}

export class CriarCardapioController {
  // conexão com o banco, aberta e mantida pelo Controller
  private readonly conexao: Database;

  constructor() {
    this.conexao = Database.getInstancia();
  }

  /** Produtos para o select da tela. */
  async listarProdutos(): Promise<ProdutoLinha[]> {
    return Produto.listarTodos(this.conexao);
  }

  /** Consulta com 2 filtros: período da data e tipo de refeição. */
  async consultar(dadosFiltro: FiltroCardapioAtributos = {}): Promise<CardapioRegistro[]> {
    const filtro = new FiltroCardapio(dadosFiltro);
    lancarSeTiverErros(filtro.validar());
    return CardapioDiario.consultar(this.conexao, filtro);
  }

  /** Valida tudo e só então cria o cardápio e dá saída no estoque dos alimentos usados. */
  async criarCardapioDiario(dados: unknown): Promise<CardapioDiario> {
    const cardapio = new CardapioDiario(comoObjeto(dados));
    lancarSeTiverErros(cardapio.validar());
    await this.conexao.comTransacao(async (cliente) => {
      await cardapio.incluir(cliente);
      await this.registrarItens(cliente, cardapio);
    });
    return cardapio;
  }

  /** Estorna o estoque dos itens antigos e registra os novos na mesma transação. */
  async alterar(id: number, dados: unknown): Promise<CardapioDiario> {
    const cardapio = new CardapioDiario(comoObjeto(dados));
    lancarSeTiverErros(cardapio.validar());
    await this.conexao.comTransacao(async (cliente) => {
      await CardapioDiario.estornarEstoque(cliente, id);
      await cardapio.alterar(cliente, id);
      await this.registrarItens(cliente, cardapio);
    });
    return cardapio;
  }

  /** Estorna o estoque dos alimentos usados e exclui o cardápio. */
  async excluir(id: number): Promise<void> {
    await this.conexao.comTransacao(async (cliente) => {
      await CardapioDiario.estornarEstoque(cliente, id);
      await CardapioDiario.excluir(cliente, id);
    });
  }

  /** Grava cada item do cardápio (o Model dá a saída no estoque e só permite produtos da categoria Alimento). */
  private async registrarItens(cliente: ExecutorSQL, cardapio: CardapioDiario): Promise<void> {
    const itens = cardapio.getItens();
    for (let i = 0; i < itens.length; i++) {
      await cardapio.incluirItem(cliente, itens[i], i);
    }
  }
}
