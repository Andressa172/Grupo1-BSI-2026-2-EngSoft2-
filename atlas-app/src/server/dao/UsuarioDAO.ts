// DAO - Usuario (RF_B2 - Gerenciar Funcionários e Autenticação)
// Quem cria este DAO é o model Usuario, com a conexão que recebe do UsuarioController.
// O DAO só executa SQL com parâmetros: recebe a conexão no construtor e os dados por parâmetro, e
// devolve registros simples (UsuarioRegistro). Quem monta o Usuario é o Model.
import type { ExecutorSQL } from './tipos';
import type { PerfilUsuario } from '../model/Usuario';
import type { FiltroUsuario } from '../model/FiltroUsuario';
import { ErroRegraDeNegocio } from '../erros';

// dados que o Model passa para gravar
export interface UsuarioDados {
  id?: number;
  nome: string;
  login: string;
  senhaHash: string;
  perfil: PerfilUsuario;
  cpf: string | null;
  ativo: boolean;
}

// registro lido do banco
export interface UsuarioRegistro extends UsuarioDados {
  id: number;
}

interface UsuarioLinha {
  id: number;
  nome: string;
  login: string;
  senha_hash: string;
  perfil: PerfilUsuario;
  cpf: string | null;
  ativo: boolean;
}

const COLUNAS = 'id, nome, login, senha_hash, perfil, cpf, ativo';

function linhaParaRegistro(linha: UsuarioLinha): UsuarioRegistro {
  return {
    id: linha.id,
    nome: linha.nome,
    login: linha.login,
    senhaHash: linha.senha_hash,
    perfil: linha.perfil,
    cpf: linha.cpf,
    ativo: linha.ativo,
  };
}

export class UsuarioDAO {
  constructor(private readonly executor: ExecutorSQL) {}

  async buscarPorLogin(login: string): Promise<UsuarioRegistro | null> {
    const resultado = await this.executor.query<UsuarioLinha>(
      `SELECT ${COLUNAS} FROM usuario WHERE lower(login) = lower($1)`,
      [login]
    );
    return resultado.rows[0] ? linhaParaRegistro(resultado.rows[0]) : null;
  }

  async listarTodos(): Promise<UsuarioRegistro[]> {
    const resultado = await this.executor.query<UsuarioLinha>(
      `SELECT ${COLUNAS} FROM usuario ORDER BY nome`
    );
    return resultado.rows.map(linhaParaRegistro);
  }

  // consulta com os filtros da tela (nome/login, cargo e status); filtro vazio traz todos
  async consultar(filtro: FiltroUsuario): Promise<UsuarioRegistro[]> {
    const condicoes: string[] = [];
    const parametros: unknown[] = [];

    if (filtro.getNome() !== '') {
      parametros.push(`%${filtro.getNome()}%`);
      condicoes.push(`(nome ILIKE $${parametros.length} OR login ILIKE $${parametros.length})`);
    }
    if (filtro.getPerfil() !== '') {
      parametros.push(filtro.getPerfil());
      condicoes.push(`perfil = $${parametros.length}`);
    }
    if (filtro.getStatus() === 'ATIVO') {
      condicoes.push('ativo = TRUE');
    } else if (filtro.getStatus() === 'INATIVO') {
      condicoes.push('ativo = FALSE');
    }

    const where = condicoes.length > 0 ? `WHERE ${condicoes.join(' AND ')}` : '';
    const resultado = await this.executor.query<UsuarioLinha>(
      `SELECT ${COLUNAS} FROM usuario ${where} ORDER BY nome`,
      parametros
    );
    return resultado.rows.map(linhaParaRegistro);
  }

  async buscarPorId(id: number): Promise<UsuarioRegistro | null> {
    const resultado = await this.executor.query<UsuarioLinha>(
      `SELECT ${COLUNAS} FROM usuario WHERE id = $1`,
      [id]
    );
    return resultado.rows[0] ? linhaParaRegistro(resultado.rows[0]) : null;
  }

  async existeComLogin(login: string, idIgnorado?: number): Promise<boolean> {
    const resultado = await this.executor.query<{ id: number }>(
      'SELECT id FROM usuario WHERE lower(login) = lower($1) AND ($2::int IS NULL OR id <> $2)',
      [login, idIgnorado ?? null]
    );
    return resultado.rows.length > 0;
  }

  // cpfDigitos: só os 11 dígitos (o Model já limpa)
  async existeComCpf(cpfDigitos: string, idIgnorado?: number): Promise<boolean> {
    const resultado = await this.executor.query<{ id: number }>(
      "SELECT id FROM usuario WHERE regexp_replace(cpf, '\\D', '', 'g') = $1 AND ($2::int IS NULL OR id <> $2)",
      [cpfDigitos, idIgnorado ?? null]
    );
    return resultado.rows.length > 0;
  }

  async contarGerentesAtivos(idIgnorado?: number): Promise<number> {
    const resultado = await this.executor.query<{ total: number }>(
      "SELECT COUNT(*)::int AS total FROM usuario WHERE perfil = 'GERENTE' AND ativo = TRUE AND ($1::int IS NULL OR id <> $1)",
      [idIgnorado ?? null]
    );
    return Number(resultado.rows[0]?.total ?? 0);
  }

  async inserir(dados: UsuarioDados): Promise<UsuarioRegistro> {
    const resultado = await this.executor.query<UsuarioLinha>(
      `INSERT INTO usuario (nome, login, senha_hash, perfil, cpf, ativo)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${COLUNAS}`,
      [dados.nome, dados.login, dados.senhaHash, dados.perfil, dados.cpf, dados.ativo]
    );
    return linhaParaRegistro(resultado.rows[0]);
  }

  async atualizar(dados: UsuarioDados): Promise<UsuarioRegistro | null> {
    const resultado = await this.executor.query<UsuarioLinha>(
      `UPDATE usuario
          SET nome = $1, login = $2, senha_hash = $3, perfil = $4, cpf = $5, ativo = $6
        WHERE id = $7
    RETURNING ${COLUNAS}`,
      [dados.nome, dados.login, dados.senhaHash, dados.perfil, dados.cpf, dados.ativo, dados.id]
    );
    return resultado.rows[0] ? linhaParaRegistro(resultado.rows[0]) : null;
  }

  async excluir(id: number): Promise<boolean> {
    try {
      const resultado = await this.executor.query('DELETE FROM usuario WHERE id = $1', [id]);
      return (resultado.rowCount ?? 0) > 0;
    } catch (erro) {
      // 23503 = violação de chave estrangeira: funcionário já vinculado a compras, doações, caixa, etc.
      if ((erro as { code?: string }).code === '23503') {
        throw new ErroRegraDeNegocio(
          'Este funcionário já possui registros vinculados no sistema e não pode ser excluído. Você pode inativá-lo.'
        );
      }
      throw erro;
    }
  }
}
