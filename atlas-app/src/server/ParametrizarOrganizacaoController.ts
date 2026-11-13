// Control - ParametrizarOrganizacaoController (RF_Parametrizacao)
import { Organizacao } from './model/Organizacao';
import { OrganizacaoDAO } from './dao/OrganizacaoDAO';

export interface DadosAtualizacaoOrganizacao {
  nomeFantasia: string;
  cnpj?: string | null;
  endereco?: string | null;
  telefone?: string | null;
  email?: string | null;
  caminhoLogo?: string | null;
}

export type ResultadoOrganizacao = ReturnType<Organizacao['paraLinhaDeDados']>;

const globalParaSingleton = globalThis as unknown as {
  parametrizarOrganizacaoController?: ParametrizarOrganizacaoController;
};

export class ParametrizarOrganizacaoController {
  constructor(private readonly organizacaoDAO: OrganizacaoDAO = new OrganizacaoDAO()) {}

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
    const org = await this.organizacaoDAO.obter();

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
    const org = new Organizacao({
      id: 1,
      nomeFantasia: dados.nomeFantasia,
      cnpj: dados.cnpj,
      endereco: dados.endereco,
      telefone: dados.telefone,
      email: dados.email,
      caminhoLogo: dados.caminhoLogo,
    });

    org.validar();

    const orgSalva = await this.organizacaoDAO.salvar(org);

    return orgSalva.paraLinhaDeDados();
  }
}