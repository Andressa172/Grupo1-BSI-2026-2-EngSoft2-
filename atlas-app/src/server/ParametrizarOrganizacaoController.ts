// Control - ParametrizarOrganizacaoController (RF_Parametrizacao)
import { Database } from './db/Database';
import { Organizacao } from './model/Organizacao';

export interface DadosAtualizacaoOrganizacao {
  nomeFantasia: string;
  cnpj?: string | null;
  endereco?: string | null;
  telefone?: string | null;
  email?: string | null;
  caminhoLogo?: string | null;
}

export type ResultadoOrganizacao = ReturnType<Organizacao['paraLinhaDeDados']>;

export class ParametrizarOrganizacaoController {
  private readonly conexao: Database;

  constructor() {
    this.conexao = Database.getInstancia();
  }

  /**
   * Retorna os parâmetros atuais da organização (registro id = 1).
   * Caso a tabela esteja vazia, retorna um valor padrão em memória.
   */
  async obterParametros(): Promise<ResultadoOrganizacao> {
    const org = await Organizacao.obter(this.conexao);

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

    const orgSalva = await org.salvar(this.conexao);

    return orgSalva.paraLinhaDeDados();
  }
}