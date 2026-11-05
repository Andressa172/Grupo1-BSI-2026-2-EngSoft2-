// DAO - AlocacaoRecurso (RF_F9)
import type { ExecutorSQL } from './tipos';
import { Database } from '../db/Database';
import { AlocacaoRecurso, type TipoRecurso } from '../model/AlocacaoRecurso';

interface AlocacaoRecursoLinha {
  id: number;
  evento_id: number;
  tipo: TipoRecurso;
  produto_id: number | null;
  quantidade: number | null;
  valor: string | null; // numeric vem como string no node-postgres
}

function linhaParaAlocacao(linha: AlocacaoRecursoLinha): AlocacaoRecurso {
  return new AlocacaoRecurso({
    id: linha.id,
    eventoId: linha.evento_id,
    tipo: linha.tipo,
    produtoId: linha.produto_id,
    quantidade: linha.quantidade,
    valor: linha.valor !== null ? Number(linha.valor) : null,
  });
}

export class AlocacaoRecursoDAO {
  constructor(private readonly executor: ExecutorSQL = Database.getInstancia()) {}

  async listarPorEvento(eventoId: number): Promise<AlocacaoRecurso[]> {
    const resultado = await this.executor.query<AlocacaoRecursoLinha>(
      'SELECT id, evento_id, tipo, produto_id, quantidade, valor FROM alocacao_recurso WHERE evento_id = $1 ORDER BY id',
      [eventoId]
    );
    return resultado.rows.map(linhaParaAlocacao);
  }

  async inserir(alocacao: AlocacaoRecurso): Promise<AlocacaoRecurso> {
    const dados = alocacao.paraLinhaDeDados();
    const resultado = await this.executor.query<AlocacaoRecursoLinha>(
      `INSERT INTO alocacao_recurso (evento_id, tipo, produto_id, quantidade, valor)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, evento_id, tipo, produto_id, quantidade, valor`,
      [dados.eventoId, dados.tipo, dados.produtoId, dados.quantidade, dados.valor]
    );
    return linhaParaAlocacao(resultado.rows[0]);
  }
}
