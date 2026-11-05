// DAO - Usuario (RF_B2)
import type { ExecutorSQL } from './tipos';
import { Database } from '../db/Database';
import { Usuario, limparCPF, type PerfilUsuario } from '../model/Usuario';

interface UsuarioLinha {
  id: number;
  nome: string;
  login: string;
  senha_hash: string;
  perfil: PerfilUsuario;
  cpf: string | null;
  ativo: boolean;
}

function linhaParaUsuario(linha: UsuarioLinha): Usuario {
  return new Usuario({
    id: linha.id,
    nome: linha.nome,
    login: linha.login,
    senhaHash: linha.senha_hash,
    perfil: linha.perfil,
    cpf: linha.cpf,
    ativo: linha.ativo,
  });
}

export class UsuarioDAO {
  constructor(private readonly executor: ExecutorSQL = Database.getInstancia()) {}

  async buscarPorLogin(login: string): Promise<Usuario | null> {
    const resultado = await this.executor.query<UsuarioLinha>(
      'SELECT id, nome, login, senha_hash, perfil, cpf, ativo FROM usuario WHERE login = $1',
      [login]
    );
    return resultado.rows[0] ? linhaParaUsuario(resultado.rows[0]) : null;
  }

  async listarTodos(): Promise<Usuario[]> {
    const resultado = await this.executor.query<UsuarioLinha>(
      'SELECT id, nome, login, senha_hash, perfil, cpf, ativo FROM usuario ORDER BY nome'
    );
    return resultado.rows.map(linhaParaUsuario);
  }

  async buscarPorId(id: number): Promise<Usuario | null> {
    const resultado = await this.executor.query<UsuarioLinha>(
      'SELECT id, nome, login, senha_hash, perfil, cpf, ativo FROM usuario WHERE id = $1',
      [id]
    );
    return resultado.rows[0] ? linhaParaUsuario(resultado.rows[0]) : null;
  }

  async existeComLogin(login: string, idIgnorado?: number): Promise<boolean> {
    const resultado = await this.executor.query<{ id: number }>(
      'SELECT id FROM usuario WHERE lower(login) = lower($1) AND ($2::int IS NULL OR id <> $2)',
      [login, idIgnorado ?? null]
    );
    return resultado.rows.length > 0;
  }

  async existeComCpf(cpf: string, idIgnorado?: number): Promise<boolean> {
    const cpfDigitos = limparCPF(cpf);
    const resultado = await this.executor.query<{ id: number }>(
      "SELECT id FROM usuario WHERE regexp_replace(cpf, '\\D', '', 'g') = $1 AND ($2::int IS NULL OR id <> $2)",
      [cpfDigitos, idIgnorado ?? null]
    );
    return resultado.rows.length > 0;
  }

  async inserir(usuario: Usuario): Promise<Usuario> {
    const dados = usuario.paraLinhaDeDados();
    const resultado = await this.executor.query<UsuarioLinha>(
      `INSERT INTO usuario (nome, login, senha_hash, perfil, cpf, ativo)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, nome, login, senha_hash, perfil, cpf, ativo`,
      [dados.nome, dados.login, dados.senhaHash, dados.perfil, dados.cpf, dados.ativo]
    );
    return linhaParaUsuario(resultado.rows[0]);
  }
}
