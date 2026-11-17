// Control - AtualizarEstoqueController (RF_F1 - Atualizar estoque) - "ControladorEstoque" na ERS
//
// - Não se auto-instancia: quem usa o Controller (a rota ou outro caso de uso) cria com `new`.
// - Façade: os casos de uso solicitantes chamam atualizarEstoque; a View (via rota
//   /api/estoque/movimentacoes) só chama consultar.
// - Abre e mantém a conexão com o banco (Database, Singleton), cria os Models e decide quando
//   validar. Quem cria o DAO é o Model. Os passos do fluxo básico ficam em MovimentacaoEstoque.aplicar.
//
// RF_F1 é oculto (ERS 2.2): a atualização do estoque não tem tela. Os casos de uso solicitantes
// (cardápio, eventos) chamam atualizarEstoque dentro da transação
// deles, passando a conexão dessa transação.
import { Database } from './db/Database';
import type { ExecutorSQL } from './dao/tipos';
import {
  MovimentacaoEstoque,
  type MovimentacaoEstoqueAtributos,
  type ResultadoMovimentacao,
} from './model/MovimentacaoEstoque';
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
   * Fluxo básico do RF_F1: o Controller cria a movimentação (Model) e o Model executa os passos.
   * `conexao` é a da transação do solicitante (ver MovimentacaoEstoque.aplicar).
   */
  async atualizarEstoque(conexao: ExecutorSQL, dados: MovimentacaoEstoqueAtributos): Promise<ResultadoMovimentacao> {
    return new MovimentacaoEstoque(dados).aplicar(conexao);
  }

  /** Histórico de movimentações com 3 filtros: produto, tipo e período. */
  async consultar(dadosFiltro: FiltroMovimentacaoAtributos = {}): Promise<MovimentacaoEstoqueRegistro[]> {
    const filtro = new FiltroMovimentacao(dadosFiltro);
    lancarSeTiverErros(filtro.validar());
    return MovimentacaoEstoque.consultar(this.conexao, filtro);
  }
}
