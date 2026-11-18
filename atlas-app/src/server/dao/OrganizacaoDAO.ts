// DAO - Organizacao. Só executa SQL com parâmetros. Recebe a conexão no construtor e os dados por
// parâmetro, e devolve registros simples (OrganizacaoRegistro): quem monta a Organizacao é o Model.
import type { ExecutorSQL } from './tipos';

// dados que o Model passa para gravar
export interface OrganizacaoDados {
  nomeFantasia: string;
  cnpj: string | null;
  endereco: string | null;
  telefone: string | null;
  email: string | null;
  caminhoLogo: string | null;
}

// registro lido do banco
export interface OrganizacaoRegistro extends OrganizacaoDados {
  id: number;
}

export interface OrganizacaoLinha {
  id: number;
  nome_fantasia: string;
  cnpj: string | null;
  endereco: string | null;
  telefone: string | null;
  email: string | null;
  caminho_logo: string | null;
}

function linhaParaRegistro(linha: OrganizacaoLinha): OrganizacaoRegistro {
  return {
    id: linha.id,
    nomeFantasia: linha.nome_fantasia,
    cnpj: linha.cnpj,
    endereco: linha.endereco,
    telefone: linha.telefone,
    email: linha.email,
    caminhoLogo: linha.caminho_logo,
  };
}

export class OrganizacaoDAO {
  constructor(private readonly executor: ExecutorSQL) {}

  async obter(): Promise<OrganizacaoRegistro | null> {
    const resultado = await this.executor.query<OrganizacaoLinha>(
      'SELECT id, nome_fantasia, cnpj, endereco, telefone, email, caminho_logo FROM organizacao WHERE id = 1'
    );
    return resultado.rows[0] ? linhaParaRegistro(resultado.rows[0]) : null;
  }

  async salvar(dados: OrganizacaoDados): Promise<OrganizacaoRegistro> {
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
    return linhaParaRegistro(resultado.rows[0]);
  }
}