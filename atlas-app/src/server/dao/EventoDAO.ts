// DAO - Evento (RF_F9)
import type { ExecutorSQL } from './tipos';
import { Database } from '../db/Database';
import { Evento } from '../model/Evento';
import { paraDataSimples } from './datas';

interface EventoLinha {
  id: number;
  nome: string;
  data: string | Date;
  descricao: string | null;
  criado_por: number | null;
}

function linhaParaEvento(linha: EventoLinha): Evento {
  return new Evento({
    id: linha.id,
    nome: linha.nome,
    data: paraDataSimples(linha.data),
    descricao: linha.descricao,
    criadoPor: linha.criado_por,
  });
}

export class EventoDAO {
  constructor(private readonly executor: ExecutorSQL = Database.getInstancia()) {}

  async listarTodos(): Promise<Evento[]> {
    const resultado = await this.executor.query<EventoLinha>(
      'SELECT id, nome, data, descricao, criado_por FROM evento ORDER BY data DESC, id DESC'
    );
    return resultado.rows.map(linhaParaEvento);
  }

  async buscarPorId(id: number): Promise<Evento | null> {
    const resultado = await this.executor.query<EventoLinha>(
      'SELECT id, nome, data, descricao, criado_por FROM evento WHERE id = $1',
      [id]
    );
    return resultado.rows[0] ? linhaParaEvento(resultado.rows[0]) : null;
  }

  async inserir(evento: Evento): Promise<Evento> {
    const dados = evento.paraLinhaDeDados();
    const resultado = await this.executor.query<EventoLinha>(
      `INSERT INTO evento (nome, data, descricao, criado_por)
       VALUES ($1, $2, $3, $4)
       RETURNING id, nome, data, descricao, criado_por`,
      [dados.nome, dados.data, dados.descricao, dados.criadoPor]
    );
    return linhaParaEvento(resultado.rows[0]);
  }
}
