// DAO - Doador (RF_B4)
import type { ExecutorSQL } from './tipos';
import { Database } from '../db/Database';
import { Doador } from '../model/Doador';

interface DoadorLinha {
  id: number;
  nome: string;
  contato: string | null;
  tipo_pessoa: 'FISICA' | 'JURIDICA';
  anonimo: boolean;
}

function linhaParaDoador(linha: DoadorLinha): Doador {
  return new Doador({
    id: linha.id,
    nome: linha.nome,
    contato: linha.contato,
    tipoPessoa: linha.tipo_pessoa,
    anonimo: linha.anonimo,
  });
}

export class DoadorDAO {
  constructor(private readonly executor: ExecutorSQL = Database.getInstancia()) {}

  async listarTodos(): Promise<Doador[]> {
    const resultado = await this.executor.query<DoadorLinha>(
      'SELECT id, nome, contato, tipo_pessoa, anonimo FROM doador ORDER BY nome'
    );
    return resultado.rows.map(linhaParaDoador);
  }

  async buscarPorId(id: number): Promise<Doador | null> {
    const resultado = await this.executor.query<DoadorLinha>(
      'SELECT id, nome, contato, tipo_pessoa, anonimo FROM doador WHERE id = $1',
      [id]
    );
    return resultado.rows[0] ? linhaParaDoador(resultado.rows[0]) : null;
  }

  async existeComNome(nome: string, idIgnorado?: number): Promise<boolean> {
    const resultado = await this.executor.query<{ id: number }>(
      'SELECT id FROM doador WHERE lower(nome) = lower($1) AND ($2::int IS NULL OR id <> $2)',
      [nome, idIgnorado ?? null]
    );
    return resultado.rows.length > 0;
  }

  async inserir(doador: Doador): Promise<Doador> {
    const dados = doador.paraLinhaDeDados();
    const resultado = await this.executor.query<DoadorLinha>(
      `INSERT INTO doador (nome, contato, tipo_pessoa, anonimo)
       VALUES ($1, $2, $3, $4)
       RETURNING id, nome, contato, tipo_pessoa, anonimo`,
      [dados.nome, dados.contato, dados.tipoPessoa, dados.anonimo]
    );
    return linhaParaDoador(resultado.rows[0]);
  }

  async atualizar(doador: Doador): Promise<Doador | null> {
    const dados = doador.paraLinhaDeDados();
    const resultado = await this.executor.query<DoadorLinha>(
      `UPDATE doador
          SET nome = $1, contato = $2, tipo_pessoa = $3, anonimo = $4
        WHERE id = $5
    RETURNING id, nome, contato, tipo_pessoa, anonimo`,
      [dados.nome, dados.contato, dados.tipoPessoa, dados.anonimo, dados.id]
    );
    return resultado.rows[0] ? linhaParaDoador(resultado.rows[0]) : null;
  }

  async excluir(id: number): Promise<boolean> {
    const resultado = await this.executor.query('DELETE FROM doador WHERE id = $1', [id]);
    return (resultado.rowCount ?? 0) > 0;
  }
}
