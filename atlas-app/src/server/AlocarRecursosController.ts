// Control - AlocarRecursosController (RF_F9)
import { Database } from './db/Database';
import { Evento } from './model/Evento';
import { AlocacaoRecurso, type TipoRecurso } from './model/AlocacaoRecurso';
import { EventoDAO } from './dao/EventoDAO';
import { AlocacaoRecursoDAO } from './dao/AlocacaoRecursoDAO';
import { MovimentacaoEstoque } from './model/MovimentacaoEstoque';
import { ErroNaoEncontrado, ErroRegraDeNegocio, ErroValidacao } from './erros';
import type { ExecutorSQL } from './dao/tipos';

export interface DadosNovoEvento {
  nome: string;
  data: string;
  descricao?: string | null;
  criadoPor?: number | null;
}

export interface DadosRecursoAlocado {
  tipo: TipoRecurso;
  produtoId?: number | null;
  quantidade?: number | null;
  valor?: number | null;
}

export interface ResultadoAlocacao {
  evento: ReturnType<Evento['paraLinhaDeDados']>;
  recursos: ReturnType<AlocacaoRecurso['paraLinhaDeDados']>[];
}

// interfaces enxutas pra poder trocar os DAOs por dublês nos testes
export interface IEventoDAOParaAlocacao {
  inserir(evento: Evento): Promise<Evento>;
}
export interface IAlocacaoRecursoDAOParaAlocacao {
  inserir(alocacao: AlocacaoRecurso): Promise<AlocacaoRecurso>;
}
// baixa no estoque (RF_F1): devolve false se não há saldo suficiente
export interface IEstoqueParaAlocacao {
  registrarSaida(produtoId: number, quantidade: number, origem: string): Promise<boolean>;
}

const globalParaSingleton = globalThis as unknown as { alocarRecursosController?: AlocarRecursosController };

export class AlocarRecursosController {
  constructor(
    private readonly database: Pick<Database, 'comTransacao'> = Database.getInstancia(),
    private readonly criarEventoDAO: (executor: ExecutorSQL) => IEventoDAOParaAlocacao = (executor) => new EventoDAO(executor),
    private readonly criarAlocacaoDAO: (executor: ExecutorSQL) => IAlocacaoRecursoDAOParaAlocacao = (executor) =>
      new AlocacaoRecursoDAO(executor),
    private readonly criarEstoque: (executor: ExecutorSQL) => IEstoqueParaAlocacao = (executor) => ({
      registrarSaida: (produtoId, quantidade, origem) =>
        MovimentacaoEstoque.registrarSaida(executor, produtoId, quantidade, origem),
    })
  ) {}

  static getInstancia(): AlocarRecursosController {
    if (!globalParaSingleton.alocarRecursosController) {
      globalParaSingleton.alocarRecursosController = new AlocarRecursosController();
    }
    return globalParaSingleton.alocarRecursosController;
  }

  async alocarRecursosParaEvento(
    dadosEvento: DadosNovoEvento,
    recursos: DadosRecursoAlocado[]
  ): Promise<ResultadoAlocacao> {
    if (!recursos || recursos.length === 0) {
      throw new ErroValidacao('É necessário incluir ao menos um recurso para o evento.');
    }

    const evento = new Evento(dadosEvento);
    evento.validar();

    const modelosRecurso = recursos.map((dadosRecurso) => {
      const recurso = new AlocacaoRecurso(dadosRecurso);
      recurso.validar();
      return recurso;
    });

    return this.database.comTransacao(async (client) => {
      const eventoDAO = this.criarEventoDAO(client as unknown as ExecutorSQL);
      const alocacaoDAO = this.criarAlocacaoDAO(client as unknown as ExecutorSQL);
      const estoque = this.criarEstoque(client as unknown as ExecutorSQL);

      const eventoSalvo = await eventoDAO.inserir(evento);

      const recursosSalvos: AlocacaoRecurso[] = [];
      for (const recurso of modelosRecurso) {
        if (recurso.getTipo() === 'PRODUTO') {
          const produtoId = recurso.getProdutoId()!;
          const quantidade = recurso.getQuantidade()!;

          const atualizado = await estoque.registrarSaida(produtoId, quantidade, `Alocação para evento "${evento.getNome()}"`);
          if (!atualizado) {
            throw new ErroRegraDeNegocio(
              `Estoque insuficiente para o produto ${produtoId}: não é possível alocar ${quantidade} unidade(s).`
            );
          }
        }

        recurso.setEventoId(eventoSalvo.getId()!);
        recursosSalvos.push(await alocacaoDAO.inserir(recurso));
      }

      return {
        evento: eventoSalvo.paraLinhaDeDados(),
        recursos: recursosSalvos.map((r) => r.paraLinhaDeDados()),
      };
    });
  }

  async listarEventosComRecursos(): Promise<ResultadoAlocacao[]> {
    const eventoDAO = new EventoDAO();
    const alocacaoDAO = new AlocacaoRecursoDAO();
    const eventos = await eventoDAO.listarTodos();

    const resultado: ResultadoAlocacao[] = [];
    for (const evento of eventos) {
      const recursos = await alocacaoDAO.listarPorEvento(evento.getId()!);
      resultado.push({
        evento: evento.paraLinhaDeDados(),
        recursos: recursos.map((r) => r.paraLinhaDeDados()),
      });
    }
    return resultado;
  }

  async buscarEventoOuFalhar(eventoId: number) {
    const eventoDAO = new EventoDAO();
    const evento = await eventoDAO.buscarPorId(eventoId);
    if (!evento) {
      throw new ErroNaoEncontrado('Evento não encontrado.');
    }
    return evento;
  }
}
