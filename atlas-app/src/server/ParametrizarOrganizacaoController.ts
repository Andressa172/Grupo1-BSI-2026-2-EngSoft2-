// Control - ParametrizarOrganizacaoController (RF_Parametrizacao)
import { Organizacao } from './model/Organizacao';
import { Database } from './db/Database';
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

export class ParametrizarOrganizacaoController {
  private static instancia: ParametrizarOrganizacaoController | undefined;

  private constructor(private readonly conexao: ExecutorSQL = Database.getInstancia()) {}

  static getInstancia(): ParametrizarOrganizacaoController {
    if (!ParametrizarOrganizacaoController.instancia) {
      ParametrizarOrganizacaoController.instancia = new ParametrizarOrganizacaoController();
    }
    return ParametrizarOrganizacaoController.instancia;
  }

  static getInstance(): ParametrizarOrganizacaoController {
    return ParametrizarOrganizacaoController.getInstancia();
  }

  /** Fábrica auxiliar para injeção de uma conexão falsa em testes unitários. */
  static criarParaTeste(conexao: ExecutorSQL): ParametrizarOrganizacaoController {
    return new ParametrizarOrganizacaoController(conexao);
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