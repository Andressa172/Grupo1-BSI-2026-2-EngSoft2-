// Control - AtualizarEstoqueController (RF_F1 - Atualizar estoque)
//
// - Singleton: uma única instância, guardada na propriedade estática `instancia`.
// - Façade: a View (via rota /api/estoque/movimentacoes) só conhece estes métodos.
// - Abre e mantém a conexão com o banco (Database, Singleton), cria os Models e decide quando
//   validar. Quem cria o DAO é o Model.
//
// RF_F1 é oculto (ERS 2.2): a atualização do estoque não tem tela. Ela é feita pelos casos de uso
// solicitantes (doação de produto, compras, cardápio, eventos), que chamam o Model
// MovimentacaoEstoque dentro da transação deles. Aqui fica só a consulta, para a tela mostrar
// o estoque e o histórico.
import { Database } from './db/Database';
import { MovimentacaoEstoque } from './model/MovimentacaoEstoque';
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

  /** Histórico de movimentações com 3 filtros: produto, tipo e período. */
  async consultar(dadosFiltro: FiltroMovimentacaoAtributos = {}): Promise<MovimentacaoEstoqueRegistro[]> {
    const filtro = new FiltroMovimentacao(dadosFiltro);
    lancarSeTiverErros(filtro.validar());
    return MovimentacaoEstoque.consultar(this.conexao, filtro);
  }
}
