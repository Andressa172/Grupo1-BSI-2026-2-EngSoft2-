// Model - Evento (RF_F9 - Alocar Recursos para Eventos)
// Guarda o evento e os recursos alocados, valida tudo e persiste criando o EventoDAO
// com a conexão que recebe do Controller (dentro de uma transação).
import type { ErrosDeCampo } from '../erros';
import { ErroNaoEncontrado } from '../erros';
import type { ExecutorSQL } from '../dao/tipos';
import { EventoDAO, type EventoRegistro, type ProdutoAlocado } from '../dao/EventoDAO';
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

  /** Grava o evento (os recursos e a saída no estoque, RF_F1, ficam a cargo do Controller). Dentro de uma transação. */
  async incluir(conexao: ExecutorSQL): Promise<void> {
    this.id = await new EventoDAO(conexao).inserirEvento(this.nome, paraIso(this.data), this.descricao);
  }

  /**
   * Atualiza o evento e apaga os recursos antigos. O Controller já estornou o estoque dos
   * recursos antigos e aloca os novos depois. Deve rodar dentro de uma transação.
   */
  async alterar(conexao: ExecutorSQL, id: number): Promise<void> {
    const dao = new EventoDAO(conexao);
    if (!(await dao.existe(id))) {
      throw new ErroNaoEncontrado('Evento não encontrado.');
    }

    await dao.excluirRecursos(id);
    await dao.atualizarEvento(id, this.nome, paraIso(this.data), this.descricao);
    this.id = id;
  }

  /** Exclui o evento (cascata remove os recursos). O Controller já estornou o estoque. */
  static async excluir(conexao: ExecutorSQL, id: number): Promise<void> {
    if (!(await new EventoDAO(conexao).excluirEvento(id))) {
      throw new ErroNaoEncontrado('Evento não encontrado.');
    }
  }

  /** Produtos já alocados ao evento, para o Controller estornar o estoque. */
  static async listarProdutosAlocados(conexao: ExecutorSQL, eventoId: number): Promise<ProdutoAlocado[]> {
    return new EventoDAO(conexao).listarProdutosAlocados(eventoId);
  }

  /** Origem registrada no histórico de estoque para as saídas deste evento. */
  getOrigemEstoque(): string {
    return `Alocação para evento "${this.nome}"`;
  }

  /** Grava um recurso alocado. Chamado pelo Controller, recurso a recurso, depois da saída no estoque (se for produto). */
  async incluirRecurso(conexao: ExecutorSQL, recurso: AlocacaoRecurso): Promise<void> {
    await new EventoDAO(conexao).inserirRecurso(this.id!, recurso);
  }

  static async consultar(conexao: ExecutorSQL, filtro: FiltroEvento): Promise<EventoRegistro[]> {
    return new EventoDAO(conexao).consultar(filtro);
  }
}
