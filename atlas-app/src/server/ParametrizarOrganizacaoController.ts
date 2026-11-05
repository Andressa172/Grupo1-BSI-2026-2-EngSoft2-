// Control - ParametrizarOrganizacaoController (RF_Parametrizacao)
import { Database } from './db/Database';
import { Organizacao, type OrganizacaoAtributos } from './model/Organization';
import { OrganizacaoDAO } from './dao/OrganizationDao';
import { ErroValidacao } from './erros';
import type { ExecutorSQL } from './dao/tipos';

export interface DadosAtualizacaoOrganizacao {
  nomeFantasia: string;
  cnpj?: string | null;
  endereco?: string | null;
  telefone?: string | null;
  email?: string | null;
  caminhoLogo?: string | null;
}

export type ResultadoOrganizacao = ReturnType<Organizacao['paraLinhaDeDados']>;

export interface IOrganizacaoDAOParaParametrizacao {
  obter(): Promise<Organizacao | null>;
  salvar(org: Organizacao): Promise<Organizacao>;
}

const globalParaSingleton = globalThis as unknown as {
  parametrizarOrganizacaoController?: ParametrizarOrganizacaoController;
};

export class ParametrizarOrganizacaoController {
  constructor(
    private readonly database: Pick<Database, 'query'> = Database.getInstancia(),
    private readonly criarOrganizacaoDAO: (executor: ExecutorSQL) => IOrganizacaoDAOParaParametrizacao = (executor) =>
      new OrganizacaoDAO(executor),
    private readonly organizacaoDAOSomenteLeitura: IOrganizacaoDAOParaParametrizacao = new OrganizacaoDAO()
  ) {}

  static getInstancia(): ParametrizarOrganizacaoController {
    if (!globalParaSingleton.parametrizarOrganizacaoController) {
      globalParaSingleton.parametrizarOrganizacaoController = new ParametrizarOrganizacaoController();
    }
    return globalParaSingleton.parametrizarOrganizacaoController;
  }

  /**
   * Retorna os parâmetros atuais da organização (registro id = 1).
   * Caso a tabela esteja vazia, retorna um valor padrão em memória.
   */
  async obterParametros(): Promise<ResultadoOrganizacao> {
    const org = await this.organizacaoDAOSomenteLeitura.obter();

    if (!org) {
      const orgPadrao = new Organizacao({
        id: 1,
        nomeFantasia: 'ATLAS',
        caminhoLogo: null,
      });
      return orgPadrao.paraLinhaDeDados();
    }

    return org.paraLinhaDeDados();
  }

  /**
   * Valida e persiste as informações da organização no banco de dados.
   */
  async salvarParametros(dados: DadosAtualizacaoOrganizacao): Promise<ResultadoOrganizacao> {
    // 1. Cria a entidade Model passando os atributos
    const org = new Organizacao({
      id: 1,
      nomeFantasia: dados.nomeFantasia,
      cnpj: dados.cnpj,
      endereco: dados.endereco,
      telefone: dados.telefone,
      email: dados.email,
      caminhoLogo: dados.caminhoLogo,
    });

    // 2. Executa a validação de domínio
    org.validar();

    // 3. Persiste via DAO usando o executor padrão
    const orgDAO = this.criarOrganizacaoDAO(this.database as unknown as ExecutorSQL);
    const orgSalva = await orgDAO.salvar(org);

    return orgSalva.paraLinhaDeDados();
  }
}