// Control - CriarCardapioController (RF_F10 - Criar Cardápio Diário)
//
// - Singleton: uma única instância, guardada na propriedade estática `instancia`.
// - Façade: a View (via rota /api/cardapios) só conhece estes métodos.
// - Abre e mantém a conexão com o banco (Database, Singleton), cria o Model CardapioDiario,
//   decide quando validar e persistir e controla a transação (tudo grava ou nada grava).
//   Quem cria o CardapioDiarioDAO é o Model.
import { Database } from './db/Database';
import { CardapioDiario, type CardapioDiarioAtributos } from './model/CardapioDiario';
import { FiltroCardapio, type FiltroCardapioAtributos } from './model/FiltroCardapio';
import type { CardapioRegistro } from './dao/CardapioDiarioDAO';
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
  private static instancia: CriarCardapioController | undefined;

  // conexão com o banco, aberta e mantida pelo Controller
  private readonly conexao: Database;

  private constructor() {
    this.conexao = Database.getInstancia();
  }

  static getInstancia(): CriarCardapioController {
    if (!CriarCardapioController.instancia) {
      CriarCardapioController.instancia = new CriarCardapioController();
    }
    return CriarCardapioController.instancia;
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
    await this.conexao.comTransacao((cliente) => cardapio.incluir(cliente));
    return cardapio;
  }

  /** Estorna o estoque dos itens antigos e registra os novos na mesma transação. */
  async alterar(id: number, dados: unknown): Promise<CardapioDiario> {
    const cardapio = new CardapioDiario(comoObjeto(dados));
    lancarSeTiverErros(cardapio.validar());
    await this.conexao.comTransacao((cliente) => cardapio.alterar(cliente, id));
    return cardapio;
  }

  /** Estorna o estoque dos alimentos usados e exclui o cardápio. */
  async excluir(id: number): Promise<void> {
    await this.conexao.comTransacao((cliente) => CardapioDiario.excluir(cliente, id));
  }
}
