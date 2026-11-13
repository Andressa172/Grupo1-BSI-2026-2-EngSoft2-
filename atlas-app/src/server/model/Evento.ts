// Model - Evento (RF_F9 - Alocar Recursos para Eventos)
// Guarda o evento e os recursos alocados, valida tudo e persiste criando o EventoDAO
// com a conexão que recebe do Controller (dentro de uma transação).
import type { ErrosDeCampo } from '../erros';
import { ErroNaoEncontrado, ErroValidacao } from '../erros';
import type { ExecutorSQL } from '../dao/tipos';
import { EventoDAO, type EventoRegistro } from '../dao/EventoDAO';
import type { FiltroEvento } from './FiltroEvento';
import { AlocacaoRecurso } from './AlocacaoRecurso';
import { dataValida, parseData, paraIso, textoSeguro } from './datasBR';

export interface EventoAtributos {
  nome: string;
  data: string; // dd/mm/aaaa
  descricao?: string | null;
  recursos: unknown;
}

const MAXIMO_RECURSOS = 50;

export class Evento {
  private id?: number;
  private readonly nome: string;
  private readonly data: Date;
  private readonly descricao: string | null;
  private readonly recursos: AlocacaoRecurso[];
  private readonly recursosEmFormatoInvalido: boolean;

  constructor(atributos: Partial<EventoAtributos>) {
    this.nome = textoSeguro(atributos.nome);
    this.data = parseData(atributos.data);
    this.descricao = textoSeguro(atributos.descricao) || null;
    this.recursosEmFormatoInvalido = atributos.recursos !== undefined && !Array.isArray(atributos.recursos);
    this.recursos = Array.isArray(atributos.recursos)
      ? atributos.recursos.slice(0, MAXIMO_RECURSOS + 1).map((r) => new AlocacaoRecurso(r))
      : [];
  }

  getId(): number | undefined {
    return this.id;
  }

  getNome(): string {
    return this.nome;
  }

  getData(): Date {
    return this.data;
  }

  getRecursos(): readonly AlocacaoRecurso[] {
    return this.recursos;
  }

  validar(): ErrosDeCampo {
    const erros: ErrosDeCampo = {};

    if (this.nome.length === 0) {
      erros.nome = 'Nome inválido: o nome do evento é obrigatório.';
    } else if (this.nome.length > 120) {
      erros.nome = 'Nome inválido: no máximo 120 caracteres.';
    }

    // data no passado é permitida (cadastro retroativo), a tela só avisa - não bloqueia
    if (!dataValida(this.data)) {
      erros.data = 'Data inválida: use o formato dd/mm/aaaa.';
    }

    if (this.recursosEmFormatoInvalido || this.recursos.length === 0) {
      erros.recursos = 'Informe ao menos um recurso para o evento.';
    } else if (this.recursos.length > MAXIMO_RECURSOS) {
      erros.recursos = `Um evento pode ter no máximo ${MAXIMO_RECURSOS} recursos.`;
    } else {
      this.recursos.forEach((recurso, i) => {
        const errosRecurso = recurso.validar();
        for (const campo of Object.keys(errosRecurso)) erros[`recurso.${i}.${campo}`] = errosRecurso[campo];
      });
    }

    return erros;
  }

  // ------------------------------ persistência ------------------------------

  /** Grava o evento e aloca os recursos (RF_F1). Deve rodar dentro de uma transação. */
  async incluir(conexao: ExecutorSQL): Promise<void> {
    const dao = new EventoDAO(conexao);
    this.id = await dao.inserirEvento(this.nome, paraIso(this.data), this.descricao);
    await this.alocarRecursos(dao, this.id);
  }

  /**
   * Substitui o evento e os recursos alocados: estorna o estoque dos recursos antigos,
   * apaga-os e aloca os novos na mesma transação. Deve rodar dentro de uma transação.
   */
  async alterar(conexao: ExecutorSQL, id: number): Promise<void> {
    const dao = new EventoDAO(conexao);
    if (!(await dao.existe(id))) {
      throw new ErroNaoEncontrado('Evento não encontrado.');
    }

    await dao.restaurarEstoqueRecursos(id);
    await dao.excluirRecursos(id);
    await dao.atualizarEvento(id, this.nome, paraIso(this.data), this.descricao);
    this.id = id;
    await this.alocarRecursos(dao, id);
  }

  /** Estorna o estoque alocado e exclui o evento (cascata remove os recursos). */
  static async excluir(conexao: ExecutorSQL, id: number): Promise<void> {
    const dao = new EventoDAO(conexao);
    await dao.restaurarEstoqueRecursos(id);
    if (!(await dao.excluirEvento(id))) {
      throw new ErroNaoEncontrado('Evento não encontrado.');
    }
  }

  private async alocarRecursos(dao: EventoDAO, eventoId: number): Promise<void> {
    const origem = `Alocação para evento "${this.nome}"`;
    for (let i = 0; i < this.recursos.length; i++) {
      const recurso = this.recursos[i];
      const alocado = await dao.registrarRecurso(eventoId, recurso, origem);
      if (!alocado) {
        throw new ErroValidacao('Estoque insuficiente.', {
          [`recurso.${i}.quantidade`]: 'Estoque insuficiente para a quantidade informada.',
        });
      }
    }
  }

  static async consultar(conexao: ExecutorSQL, filtro: FiltroEvento): Promise<EventoRegistro[]> {
    return new EventoDAO(conexao).consultar(filtro);
  }
}
