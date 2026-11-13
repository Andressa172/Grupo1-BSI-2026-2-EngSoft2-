import { Database } from '../db/Database';
import { Organizacao } from '../model/Organizacao';
import type { ExecutorSQL } from './tipos';

export interface OrganizacaoLinha {
  id: number;
  nome_fantasia: string;
  cnpj: string | null;
  endereco: string | null;
  telefone: string | null;
  email: string | null;
  caminho_logo: string | null;
}

function linhaParaOrganizacao(linha: OrganizacaoLinha): Organizacao {
  return new Organizacao({
    id: linha.id,
    nomeFantasia: linha.nome_fantasia,
    cnpj: linha.cnpj,
    endereco: linha.endereco,
    telefone: linha.telefone,
    email: linha.email,
    caminhoLogo: linha.caminho_logo,
  });
}

export class OrganizacaoDAO {
  constructor(private readonly executor: ExecutorSQL = Database.getInstancia()) {}

  async obter(): Promise<Organizacao | null> {
    const resultado = await this.executor.query<OrganizacaoLinha>(
      'SELECT id, nome_fantasia, cnpj, endereco, telefone, email, caminho_logo FROM organizacao WHERE id = 1'
    );
    return resultado.rows[0] ? linhaParaOrganizacao(resultado.rows[0]) : null;
  }

  async salvar(org: Organizacao): Promise<Organizacao> {
    const dados = org.paraLinhaDeDados();
    const resultado = await this.executor.query<OrganizacaoLinha>(
      `INSERT INTO organizacao (id, nome_fantasia, cnpj, endereco, telefone, email, caminho_logo)
       VALUES (1, $1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
         nome_fantasia = EXCLUDED.nome_fantasia,
         cnpj = EXCLUDED.cnpj,
         endereco = EXCLUDED.endereco,
         telefone = EXCLUDED.telefone,
         email = EXCLUDED.email,
         caminho_logo = COALESCE(EXCLUDED.caminho_logo, organizacao.caminho_logo)
       RETURNING id, nome_fantasia, cnpj, endereco, telefone, email, caminho_logo`,
      [dados.nomeFantasia, dados.cnpj, dados.endereco, dados.telefone, dados.email, dados.caminhoLogo]
    );
    return linhaParaOrganizacao(resultado.rows[0]);
  }
}