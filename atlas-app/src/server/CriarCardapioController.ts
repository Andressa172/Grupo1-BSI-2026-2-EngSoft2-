// Control - CriarCardapioController (RF_F10 - Criar Cardápio Diário)
//
// - Não se auto-instancia: quem usa o Controller (a rota) cria com `new`.
// - Façade: a View (via rota /api/cardapios) só conhece estes métodos.
// - Abre e mantém a conexão com o banco (Database, Singleton), cria o Model CardapioDiario,
//   decide quando validar e persistir e controla a transação (tudo grava ou nada grava).
//   Quem cria o CardapioDiarioDAO é o Model; a saída/estorno no estoque (RF_F1) é feita por este
//   Controller com os Models Produto e MovimentacaoEstoque (nenhum Controller chama outro Controller), na mesma transação.
import { Database } from './db/Database';
import { MovimentacaoEstoque, type MovimentacaoEstoqueAtributos } from './model/MovimentacaoEstoque';
import { Produto, type ResultadoMovimentacao } from './model/Produto';
import type { ExecutorSQL } from './dao/tipos';
import { CardapioDiario, type CardapioDiarioAtributos } from './model/CardapioDiario';
import { FiltroCardapio, type FiltroCardapioAtributos } from './model/FiltroCardapio';
import type { CardapioRegistro } from './dao/CardapioDiarioDAO';
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
      await this.estornarItens(cliente, id);
      await cardapio.alterar(cliente, id);
      await this.registrarItens(cliente, cardapio);
    });
    return cardapio;
  }

  /** Estorna o estoque dos alimentos usados e exclui o cardápio. */
  async excluir(id: number): Promise<void> {
    await this.conexao.comTransacao(async (cliente) => {
      await this.estornarItens(cliente, id);
      await CardapioDiario.excluir(cliente, id);
    });
  }

  /** Dá saída no estoque de cada alimento e grava o item; só permite produtos da categoria Alimento. */
  private async registrarItens(cliente: ExecutorSQL, cardapio: CardapioDiario): Promise<void> {
    const itens = cardapio.getItens();
    for (let i = 0; i < itens.length; i++) {
      const item = itens[i];
      let motivo: 'ok' | 'categoria' | 'produto' | 'estoque' = await cardapio.verificarItem(cliente, item);
      if (motivo === 'ok') {
        const resultado = await this.movimentarEstoque(cliente, {
          produtoId: item.getProdutoId(),
          tipo: 'SAIDA',
          quantidade: item.getQuantidadeUtilizada(),
          origem: cardapio.getOrigemEstoque(),
        });
        if (resultado !== 'APLICADA') motivo = 'estoque';
      }
      if (motivo !== 'ok') {
        const mensagens: Record<string, string> = {
          categoria: 'Só é permitido incluir alimentos no cardápio.',
          estoque: 'Estoque insuficiente para a quantidade informada.',
          produto: 'Alimento inválido: não cadastrado.',
        };
        throw new ErroValidacao('Não foi possível incluir o item.', { [`item.${i}.produtoId`]: mensagens[motivo] });
      }
      await cardapio.incluirItem(cliente, item);
    }
  }

  /** Devolve ao estoque os alimentos usados no cardápio (estorno), antes de apagar os itens antigos. */
  private async estornarItens(cliente: ExecutorSQL, cardapioId: number): Promise<void> {
    const itens = await CardapioDiario.listarItens(cliente, cardapioId);
    for (const item of itens) {
      await this.movimentarEstoque(cliente, {
        produtoId: item.produtoId,
        tipo: 'ENTRADA',
        quantidade: item.quantidadeUtilizada,
        origem: `Estorno: cardápio #${cardapioId}`,
      });
    }
  }

  /** RF_F1 dentro da transação deste caso de uso: estoque (Produto) e depois o histórico (MovimentacaoEstoque). */
  private async movimentarEstoque(cliente: ExecutorSQL, dados: MovimentacaoEstoqueAtributos): Promise<ResultadoMovimentacao> {
    const movimentacao = new MovimentacaoEstoque(dados);
    const erros = movimentacao.validar();
    if (Object.keys(erros).length > 0) throw new ErroValidacao('Movimentação de estoque inválida.', erros);
    const resultado = await Produto.comId(movimentacao.getProdutoId()).aplicarMovimentacao(
      cliente,
      movimentacao.getTipo(),
      movimentacao.getQuantidade(),
      movimentacao.getDataValidadeIso()
    );
    if (resultado === 'APLICADA') await movimentacao.registrar(cliente);
    return resultado;
  }
}
