// Control - AtualizarEstoqueController (RF_F1 - Atualizar estoque) - "ControladorEstoque" na ERS
//
// - Singleton: uma única instância, guardada na propriedade estática `instancia`.
// - Façade: os casos de uso solicitantes chamam atualizarEstoque; a View (via rota
//   /api/estoque/movimentacoes) só chama consultar.
// - Abre e mantém a conexão com o banco (Database, Singleton), cria os Models e decide quando
//   validar. Quem cria o DAO é o Model.
//
// RF_F1 é oculto (ERS 2.2): a atualização do estoque não tem tela. Os casos de uso solicitantes
// (doação de produto, compras, cardápio, eventos) chamam atualizarEstoque dentro da transação
// deles, passando a conexão dessa transação.
import { Database } from './db/Database';
import type { ExecutorSQL } from './dao/tipos';
import {
  MovimentacaoEstoque,
  type MovimentacaoEstoqueAtributos,
  type ResultadoMovimentacao,
} from './model/MovimentacaoEstoque';
import { Produto } from './model/Produto';
import { FiltroMovimentacao, type FiltroMovimentacaoAtributos } from './model/FiltroMovimentacao';
import type { MovimentacaoEstoqueRegistro } from './dao/MovimentacaoEstoqueDAO';
import { ErroValidacao, type ErrosDeCampo } from './erros';

const MENSAGEM_CAMPOS_INVALIDOS = 'Corrija os campos destacados.';

function lancarSeTiverErros(erros: ErrosDeCampo): void {
  if (Object.keys(erros).length > 0) {
    throw new ErroValidacao(MENSAGEM_CAMPOS_INVALIDOS, erros);
  }
}

export class AtualizarEstoqueController {
  private static instancia: AtualizarEstoqueController | undefined;

  // conexão com o banco, aberta e mantida pelo Controller
  private readonly conexao: Database;

  private constructor() {
    this.conexao = Database.getInstancia();
  }

  static getInstancia(): AtualizarEstoqueController {
    if (!AtualizarEstoqueController.instancia) {
      AtualizarEstoqueController.instancia = new AtualizarEstoqueController();
    }
    return AtualizarEstoqueController.instancia;
  }

  /**
   * Fluxo básico do RF_F1 (diagrama de sequência "Atualizar estoque").
   * `conexao` é a da transação do solicitante: se ele desistir por causa do resultado (ou o banco
   * falhar), o rollback desfaz o estoque e o histórico juntos (fluxo alternativo 4.1).
   */
  async atualizarEstoque(conexao: ExecutorSQL, dados: MovimentacaoEstoqueAtributos): Promise<ResultadoMovimentacao> {
    // passo 1: dados da movimentação (produto, quantidade e tipo)
    const movimentacao = new MovimentacaoEstoque(dados);
    const erros = movimentacao.validar();
    if (Object.keys(erros).length > 0) throw new ErroValidacao('Movimentação de estoque inválida.', erros);

    // passo 2 (1.1): o produto está cadastrado? senão, fluxo alternativo 2.1
    const produto = await this.verifProduto(conexao, movimentacao.getProdutoId());
    if (!produto) return 'PRODUTO_INEXISTENTE';

    // passo 3 (1.2 e 1.3): nova quantidade; saída maior que o estoque é o fluxo alternativo 3.1
    if (!produto.atualizQuantidade(movimentacao.getQuantidade(), movimentacao.getTipo(), movimentacao.getDataValidadeIso())) {
      return 'SALDO_INSUFICIENTE';
    }

    // passo 4: atualiza o estoque do produto no banco
    await produto.salvarEstoque(conexao);

    // passo 5 (1.4): registra o histórico da movimentação
    await movimentacao.registrar(conexao);

    // passo 6: confirmação para o solicitante
    return 'APLICADA';
  }

  /** Passo 1.1: devolve o produto se ele está cadastrado, ou null (fluxo alternativo 2.1). */
  async verifProduto(conexao: ExecutorSQL, produtoId: number): Promise<Produto | null> {
    return Produto.buscarParaAtualizarEstoque(conexao, produtoId);
  }

  /** Histórico de movimentações com 3 filtros: produto, tipo e período. */
  async consultar(dadosFiltro: FiltroMovimentacaoAtributos = {}): Promise<MovimentacaoEstoqueRegistro[]> {
    const filtro = new FiltroMovimentacao(dadosFiltro);
    lancarSeTiverErros(filtro.validar());
    return MovimentacaoEstoque.consultar(this.conexao, filtro);
  }
}
