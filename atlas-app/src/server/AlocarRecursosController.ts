// Control - AlocarRecursosController (RF_F9 - Alocar recursos para eventos)
//
// - Singleton: uma única instância, guardada na propriedade estática `instancia`.
// - Façade: a View (via rota /api/eventos) só conhece estes métodos.
// - Abre e mantém a conexão com o banco (Database, Singleton), cria o Model Evento,
//   decide quando validar e persistir e controla a transação (tudo grava ou nada grava).
//   Quem cria o EventoDAO é o Model; a saída/estorno no estoque (RF_F1) é pedida por este
//   Controller ao AtualizarEstoqueController, dentro da mesma transação.
import { Database } from './db/Database';
import { AtualizarEstoqueController } from './AtualizarEstoqueController';
import type { ExecutorSQL } from './dao/tipos';
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
    await this.conexao.comTransacao(async (cliente) => {
      await evento.incluir(cliente);
      await this.alocarRecursos(cliente, evento);
    });
    return evento;
  }

  /** Estorna o estoque dos recursos antigos e aloca os novos na mesma transação. */
  async alterar(id: number, dados: unknown): Promise<Evento> {
    const evento = new Evento(comoObjeto(dados));
    lancarSeTiverErros(evento.validar());
    await this.conexao.comTransacao(async (cliente) => {
      await this.estornarRecursos(cliente, id);
      await evento.alterar(cliente, id);
      await this.alocarRecursos(cliente, evento);
    });
    return evento;
  }

  /** Estorna o estoque alocado e exclui o evento. */
  async excluir(id: number): Promise<void> {
    await this.conexao.comTransacao(async (cliente) => {
      await this.estornarRecursos(cliente, id);
      await Evento.excluir(cliente, id);
    });
  }

  /** Aloca cada recurso; se for produto, desconta do estoque (nada é gravado se não houver saldo). */
  private async alocarRecursos(cliente: ExecutorSQL, evento: Evento): Promise<void> {
    const recursos = evento.getRecursos();
    for (let i = 0; i < recursos.length; i++) {
      const recurso = recursos[i];
      if (recurso.getTipo() === 'PRODUTO') {
        const resultado = await AtualizarEstoqueController.getInstancia().atualizarEstoque(cliente, {
          produtoId: recurso.getProdutoId(),
          tipo: 'SAIDA',
          quantidade: recurso.getQuantidade(),
          origem: evento.getOrigemEstoque(),
        });
        if (resultado !== 'APLICADA') {
          throw new ErroValidacao('Estoque insuficiente.', {
            [`recurso.${i}.quantidade`]: 'Estoque insuficiente para a quantidade informada.',
          });
        }
      }
      await evento.incluirRecurso(cliente, recurso);
    }
  }

  /** Devolve ao estoque os produtos alocados no evento (estorno), antes de apagar os recursos antigos. */
  private async estornarRecursos(cliente: ExecutorSQL, eventoId: number): Promise<void> {
    const produtos = await Evento.listarProdutosAlocados(cliente, eventoId);
    for (const produto of produtos) {
      await AtualizarEstoqueController.getInstancia().atualizarEstoque(cliente, {
        produtoId: produto.produtoId,
        tipo: 'ENTRADA',
        quantidade: produto.quantidade,
        origem: `Estorno: evento #${eventoId}`,
      });
    }
  }
}
