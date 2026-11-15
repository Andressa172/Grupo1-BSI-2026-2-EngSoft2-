// DAO - Evento (RF_F9). Só executa SQL, sempre com parâmetros.
import type { ExecutorSQL } from './tipos';
import { Database } from '../db/Database';
import type { AlocacaoRecurso } from '../model/AlocacaoRecurso';
import type { FiltroEvento } from '../model/FiltroEvento';

export interface EventoRegistro {
  id: number;
  nome: string;
  data: string; // aaaa-mm-dd
  descricao: string | null;
  recursos: {
    id: number;
    tipo: 'PRODUTO' | 'FINANCEIRO';
    produtoId: number | null;
    produto: string | null;
    quantidade: number | null;
    valor: number | null;
  }[];
}

interface LinhaConsulta {
  id: number;
  nome: string;
  data: string;
  descricao: string | null;
  recurso_id: number | null;
  tipo: 'PRODUTO' | 'FINANCEIRO' | null;
  produto_id: number | null;
  produto: string | null;
  quantidade: number | null;
  valor: string | null; // numeric vem como string no node-postgres
}

export interface ProdutoAlocado {
  produtoId: number;
  quantidade: number;
}

export class EventoDAO {
  constructor(private readonly executor: ExecutorSQL = Database.getInstancia()) {}

  async inserirEvento(nome: string, dataIso: string, descricao: string | null): Promise<number> {
    const resultado = await this.executor.query<{ id: number }>(
      'INSERT INTO evento (nome, data, descricao) VALUES ($1, $2, $3) RETURNING id',
      [nome, dataIso, descricao]
    );
    return resultado.rows[0].id;
  }

  async inserirRecurso(eventoId: number, recurso: AlocacaoRecurso): Promise<void> {
    const dados = recurso.paraLinhaDeDados();
    await this.executor.query(
      'INSERT INTO alocacao_recurso (evento_id, tipo, produto_id, quantidade, valor) VALUES ($1, $2, $3, $4, $5)',
      [eventoId, dados.tipo, dados.produtoId, dados.quantidade, dados.valor]
    );
  }

  async existe(id: number): Promise<boolean> {
    const resultado = await this.executor.query('SELECT id FROM evento WHERE id = $1', [id]);
    return resultado.rows.length > 0;
  }

  async atualizarEvento(id: number, nome: string, dataIso: string, descricao: string | null): Promise<void> {
    await this.executor.query('UPDATE evento SET nome = $1, data = $2, descricao = $3 WHERE id = $4', [
      nome,
      dataIso,
      descricao,
      id,
    ]);
  }

  /** Produtos alocados ao evento (recursos do tipo PRODUTO), para o Controller estornar o estoque. */
  async listarProdutosAlocados(eventoId: number): Promise<ProdutoAlocado[]> {
    const recursos = await this.executor.query<{ produto_id: number; quantidade: number }>(
      "SELECT produto_id, quantidade FROM alocacao_recurso WHERE evento_id = $1 AND tipo = 'PRODUTO'",
      [eventoId]
    );
    return recursos.rows.map((r) => ({ produtoId: r.produto_id, quantidade: r.quantidade }));
  }

  async excluirRecursos(eventoId: number): Promise<void> {
    await this.executor.query('DELETE FROM alocacao_recurso WHERE evento_id = $1', [eventoId]);
  }

  async excluirEvento(id: number): Promise<boolean> {
    const resultado = await this.executor.query('DELETE FROM evento WHERE id = $1', [id]);
    return (resultado.rowCount ?? 0) > 0;
  }

  // filtros (nome e período) se combinam com AND; filtro vazio traz todos os eventos
  async consultar(filtro: FiltroEvento): Promise<EventoRegistro[]> {
    const condicoes: string[] = [];
    const parametros: unknown[] = [];

    if (filtro.getNome() !== '') {
      parametros.push(`%${filtro.getNome().toLowerCase()}%`);
      condicoes.push(`lower(e.nome) LIKE $${parametros.length}`);
    }
    const de = filtro.getDataInicial();
    if (de !== null) {
      parametros.push(de);
      condicoes.push(`e.data >= $${parametros.length}`);
    }
    const ate = filtro.getDataFinal();
    if (ate !== null) {
      parametros.push(ate);
      condicoes.push(`e.data <= $${parametros.length}`);
    }
    const where = condicoes.length > 0 ? `WHERE ${condicoes.join(' AND ')}` : '';

    const resultado = await this.executor.query<LinhaConsulta>(
      `SELECT e.id, e.nome, to_char(e.data, 'YYYY-MM-DD') AS data, e.descricao,
              a.id AS recurso_id, a.tipo, a.produto_id, p.nome AS produto, a.quantidade, a.valor
         FROM evento e
         LEFT JOIN alocacao_recurso a ON a.evento_id = e.id
         LEFT JOIN produto p ON p.id = a.produto_id
         ${where}
        ORDER BY e.data DESC, e.id DESC, a.id`,
      parametros
    );

    const porId = new Map<number, EventoRegistro>();
    for (const l of resultado.rows) {
      let evento = porId.get(l.id);
      if (!evento) {
        evento = { id: l.id, nome: l.nome, data: l.data, descricao: l.descricao, recursos: [] };
        porId.set(l.id, evento);
      }
      if (l.recurso_id !== null && l.tipo !== null) {
        evento.recursos.push({
          id: l.recurso_id,
          tipo: l.tipo,
          produtoId: l.produto_id,
          produto: l.produto,
          quantidade: l.quantidade,
          valor: l.valor !== null ? Number(l.valor) : null,
        });
      }
    }
    return [...porId.values()];
  }
}
