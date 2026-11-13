// Control - AlocarRecursosController (RF_F9 - Alocar recursos para eventos)
//
// - Singleton: uma única instância, guardada na propriedade estática `instancia`.
// - Façade: a View (via rota /api/eventos) só conhece estes métodos.
// - Abre e mantém a conexão com o banco (Database, Singleton), cria o Model Evento,
//   decide quando validar e persistir e controla a transação (tudo grava ou nada grava).
//   Quem cria o EventoDAO é o Model.
import { Database } from './db/Database';
import { Evento, type EventoAtributos } from './model/Evento';
import { FiltroEvento, type FiltroEventoAtributos } from './model/FiltroEvento';
import type { EventoRegistro } from './dao/EventoDAO';
import { ErroValidacao, type ErrosDeCampo } from './erros';

const MENSAGEM_CAMPOS_INVALIDOS = 'Corrija os campos destacados.';

function lancarSeTiverErros(erros: ErrosDeCampo): void {
  if (Object.keys(erros).length > 0) {
    throw new ErroValidacao(MENSAGEM_CAMPOS_INVALIDOS, erros);
  }
}

function comoObjeto(dados: unknown): Partial<EventoAtributos> {
  if (typeof dados !== 'object' || dados === null || Array.isArray(dados)) {
    throw new ErroValidacao('Dados inválidos.');
  }
  return dados as Partial<EventoAtributos>;
}

export class AlocarRecursosController {
  private static instancia: AlocarRecursosController | undefined;

  // conexão com o banco, aberta e mantida pelo Controller
  private readonly conexao: Database;

  private constructor() {
    this.conexao = Database.getInstancia();
  }

  static getInstancia(): AlocarRecursosController {
    if (!AlocarRecursosController.instancia) {
      AlocarRecursosController.instancia = new AlocarRecursosController();
    }
    return AlocarRecursosController.instancia;
  }

  /** Consulta com 2 filtros: nome do evento e período da data. */
  async consultar(dadosFiltro: FiltroEventoAtributos = {}): Promise<EventoRegistro[]> {
    const filtro = new FiltroEvento(dadosFiltro);
    lancarSeTiverErros(filtro.validar());
    return Evento.consultar(this.conexao, filtro);
  }

  /** Valida tudo e só então cria o evento e aloca os recursos (desconta estoque quando é produto). */
  async alocarRecursosParaEvento(dados: unknown): Promise<Evento> {
    const evento = new Evento(comoObjeto(dados));
    lancarSeTiverErros(evento.validar());
    await this.conexao.comTransacao((cliente) => evento.incluir(cliente));
    return evento;
  }

  /** Estorna o estoque dos recursos antigos e aloca os novos na mesma transação. */
  async alterar(id: number, dados: unknown): Promise<Evento> {
    const evento = new Evento(comoObjeto(dados));
    lancarSeTiverErros(evento.validar());
    await this.conexao.comTransacao((cliente) => evento.alterar(cliente, id));
    return evento;
  }

  /** Estorna o estoque alocado e exclui o evento. */
  async excluir(id: number): Promise<void> {
    await this.conexao.comTransacao((cliente) => Evento.excluir(cliente, id));
  }
}
