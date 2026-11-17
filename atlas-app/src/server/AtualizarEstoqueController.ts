// Control - AtualizarEstoqueController (RF_F1 - Atualizar estoque) - "ControladorEstoque" na ERS
//
// - Não se auto-instancia: quem usa o Controller (a rota ou outro caso de uso) cria com `new`.
// - Façade: os casos de uso solicitantes chamam atualizarEstoque; a View (via rota
//   /api/estoque/movimentacoes) só chama consultar.
// - Abre e mantém a conexão com o banco (Database, Singleton), cria os Models e decide quando
//   validar. Quem cria o DAO é o Model. 
//
// RF_F1 é oculto (ERS 2.2): a atualização do estoque não tem tela, só a consulta do histórico.
// Nenhum Controller chama outro Controller: os Controllers dos casos de uso solicitantes (compras,
// doação de produto, cardápio e eventos) rodam o mesmo fluxo com os Models Produto e
// MovimentacaoEstoque, dentro da transação deles.
import { Database } from './db/Database';
import type { ExecutorSQL } from './dao/tipos';
import { MovimentacaoEstoque, type MovimentacaoEstoqueAtributos } from './model/MovimentacaoEstoque';
import { Produto, type ResultadoMovimentacao } from './model/Produto';
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
  // conexão com o banco, aberta e mantida pelo Controller
  private readonly conexao: Database;

  constructor() {
    this.conexao = Database.getInstancia();
  }

  /**
   * Fluxo básico do RF_F1: o Controller cria os Models (MovimentacaoEstoque e Produto) e executa os passos.
   * `conexao` é a da transação do solicitante: se ele desistir por causa do resultado (ou o banco
   * falhar), o rollback desfaz o estoque e o histórico juntos (fluxo alternativo 4.1).
   */
  async atualizarEstoque(conexao: ExecutorSQL, dados: MovimentacaoEstoqueAtributos): Promise<ResultadoMovimentacao> {
    const movimentacao = new MovimentacaoEstoque(dados);
    const erros = movimentacao.validar();
    if (Object.keys(erros).length > 0) throw new ErroValidacao('Movimentação de estoque inválida.', erros);
    const resultado = await Produto.comId(movimentacao.getProdutoId()).aplicarMovimentacao(
      conexao,
      movimentacao.getTipo(),
      movimentacao.getQuantidade(),
      movimentacao.getDataValidadeIso()
    );
    if (resultado === 'APLICADA') await movimentacao.registrar(conexao);
    return resultado;
  }

  /** Histórico de movimentações com 3 filtros: produto, tipo e período. */
  async consultar(dadosFiltro: FiltroMovimentacaoAtributos = {}): Promise<MovimentacaoEstoqueRegistro[]> {
    const filtro = new FiltroMovimentacao(dadosFiltro);
    lancarSeTiverErros(filtro.validar());
    return MovimentacaoEstoque.consultar(this.conexao, filtro);
  }
}
