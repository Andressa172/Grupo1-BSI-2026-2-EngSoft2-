// DAO - Doador (RF_B4)
import type { ExecutorSQL } from './tipos';
import { Database } from '../db/Database';
import { Doador } from '../model/Doador';
import type { FiltroDoador } from '../model/FiltroDoador';

interface DoadorLinha {
  id: number;
  nome: string;
  telefone: string | null;
  email: string | null;
  cpf_cnpj: string | null;
  tipo_pessoa: 'FISICA' | 'JURIDICA';
  anonimo: boolean;
}

const COLUNAS = 'id, nome, telefone, email, cpf_cnpj, tipo_pessoa, anonimo';

// o DAO só lê a linha do banco; quem vira Doador é o próprio model
function linhaParaDoador(linha: DoadorLinha): Doador {
  return Doador.reconstituir({
    id: linha.id,
    nome: linha.nome,
    telefone: linha.telefone,
    email: linha.email,
    cpfCnpj: linha.cpf_cnpj,
    tipoPessoa: linha.tipo_pessoa,
    anonimo: linha.anonimo,
  });
}

export class DoadorDAO {
  constructor(private readonly executor: ExecutorSQL = Database.getInstancia()) {}

  async listarTodos(): Promise<Doador[]> {
    const resultado = await this.executor.query<DoadorLinha>(`SELECT ${COLUNAS} FROM doador ORDER BY nome`);
    return resultado.rows.map(linhaParaDoador);
  }

  // filtro vazio traz todos; os 3 filtros (nome, tipo de pessoa, anônimo) se combinam com AND
  async consultar(filtro: FiltroDoador): Promise<Doador[]> {
    const condicoes: string[] = [];
    const parametros: unknown[] = [];

    if (filtro.getNome() !== '') {
      parametros.push(`%${filtro.getNome().toLowerCase()}%`);
      condicoes.push(`lower(nome) LIKE $${parametros.length}`);
    }
    if (filtro.getTipoPessoa() !== '') {
      parametros.push(filtro.getTipoPessoa());
      condicoes.push(`tipo_pessoa = $${parametros.length}`);
    }
    const anonimo = filtro.getAnonimo();
    if (anonimo !== null) {
      parametros.push(anonimo);
      condicoes.push(`anonimo = $${parametros.length}`);
    }

    const where = condicoes.length > 0 ? `WHERE ${condicoes.join(' AND ')}` : '';
    const resultado = await this.executor.query<DoadorLinha>(
      `SELECT ${COLUNAS} FROM doador ${where} ORDER BY nome`,
      parametros
    );
    return resultado.rows.map(linhaParaDoador);
  }

  async buscarPorId(id: number): Promise<Doador | null> {
    const resultado = await this.executor.query<DoadorLinha>(`SELECT ${COLUNAS} FROM doador WHERE id = $1`, [id]);
    return resultado.rows[0] ? linhaParaDoador(resultado.rows[0]) : null;
  }

  // nome duplicado é permitido (duas pessoas podem ter o mesmo nome); quem identifica o doador é o CPF/CNPJ
  async existeComCpfCnpj(cpfCnpj: string, idIgnorado?: number): Promise<boolean> {
    const resultado = await this.executor.query<{ id: number }>(
      'SELECT id FROM doador WHERE cpf_cnpj = $1 AND ($2::int IS NULL OR id <> $2)',
      [cpfCnpj, idIgnorado ?? null]
    );
    return resultado.rows.length > 0;
  }

  // regra: só pode existir 1 doador anônimo cadastrado
  async existeAnonimo(idIgnorado?: number): Promise<boolean> {
    const resultado = await this.executor.query<{ id: number }>(
      'SELECT id FROM doador WHERE anonimo = TRUE AND ($1::int IS NULL OR id <> $1)',
      [idIgnorado ?? null]
    );
    return resultado.rows.length > 0;
  }

  // antes de excluir, verifica se o doador já recebeu alguma doação (FK em doacao_produto/doacao_dinheiro)
  async possuiDoacoesVinculadas(id: number): Promise<boolean> {
    const resultado = await this.executor.query<{ existe: boolean }>(
      `SELECT EXISTS(
         SELECT 1 FROM doacao_produto WHERE doador_id = $1
         UNION ALL
         SELECT 1 FROM doacao_dinheiro WHERE doador_id = $1
       ) AS existe`,
      [id]
    );
    return resultado.rows[0]?.existe ?? false;
  }

  async inserir(doador: Doador): Promise<Doador> {
    const dados = doador.paraLinhaDeDados();
    const resultado = await this.executor.query<DoadorLinha>(
      `INSERT INTO doador (nome, telefone, email, cpf_cnpj, tipo_pessoa, anonimo)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${COLUNAS}`,
      [dados.nome, dados.telefone, dados.email, dados.cpfCnpj, dados.tipoPessoa, dados.anonimo]
    );
    return linhaParaDoador(resultado.rows[0]);
  }

  async atualizar(doador: Doador): Promise<Doador | null> {
    const dados = doador.paraLinhaDeDados();
    const resultado = await this.executor.query<DoadorLinha>(
      `UPDATE doador
          SET nome = $1, telefone = $2, email = $3, cpf_cnpj = $4, tipo_pessoa = $5, anonimo = $6
        WHERE id = $7
    RETURNING ${COLUNAS}`,
      [dados.nome, dados.telefone, dados.email, dados.cpfCnpj, dados.tipoPessoa, dados.anonimo, dados.id]
    );
    return resultado.rows[0] ? linhaParaDoador(resultado.rows[0]) : null;
  }

  async excluir(id: number): Promise<boolean> {
    const resultado = await this.executor.query('DELETE FROM doador WHERE id = $1', [id]);
    return (resultado.rowCount ?? 0) > 0;
  }
}
