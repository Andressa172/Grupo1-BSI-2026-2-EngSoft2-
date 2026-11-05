import { Atendido } from '@/model/Atendido';
import { FiltroAtendido } from '@/model/FiltroAtendido';
import { type ErrosValidacao, parseDataBR } from '@/model/validacao';
import { AtendidoDAO, type RegistroAtendido } from '@/dao/AtendidoDAO';

/** Dados do formulário exatamente como digitados (tudo texto). */
export interface DadosAtendido {
  nome: string;
  dataNascimento: string;
  sexo: string;
  responsavelLegal: string;
}

export interface DadosFiltroAtendido {
  nome: string;
  sexo: string;
  idadeMinima: string;
  idadeMaxima: string;
}

export interface ResultadoAtendido {
  sucesso: boolean;
  erros: ErrosValidacao;
}

/** Linha pronta para a tabela da View. */
export interface LinhaAtendido {
  id: string;
  nome: string;
  dataNascimento: string; // dd/mm/aaaa
  idade: number;
  sexo: string;
  responsavelLegal: string;
  dataCadastro: string; // dd/mm/aaaa
}

function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

function paraEntidade(r: RegistroAtendido): Atendido {
  return new Atendido(r.nome, new Date(r.dataNascimento), r.sexo, r.responsavelLegal, new Date(r.dataCadastro), r.id);
}

/**
 * Control do caso de uso RF_B1 - Gerenciar atendidos (incluir, alterar, excluir, consultar).
 *
 * - Singleton: uma única instância (getInstancia).
 * - Façade: a View só conhece estes métodos; criar o Model, validar e usar a DAO
 *   é responsabilidade do Control (GRASP Controller).
 */
export class ControlGerenciarAtendidos {
  private static instancia: ControlGerenciarAtendidos | undefined;

  private dao = new AtendidoDAO();

  private constructor() {}

  static getInstancia(): ControlGerenciarAtendidos {
    if (!ControlGerenciarAtendidos.instancia) {
      ControlGerenciarAtendidos.instancia = new ControlGerenciarAtendidos();
    }
    return ControlGerenciarAtendidos.instancia;
  }

  private montar(dados: DadosAtendido, id = '', dataCadastro?: Date): Atendido {
    return new Atendido(
      dados.nome,
      parseDataBR(dados.dataNascimento),
      dados.sexo,
      dados.responsavelLegal,
      dataCadastro,
      id
    );
  }

  /** Atendido já existe se houver outro com mesmo nome e data de nascimento. */
  private jaCadastrado(a: Atendido): boolean {
    return this.dao
      .listar()
      .some(
        (r) =>
          r.id !== a.id &&
          r.nome.trim().toLowerCase() === a.nome.trim().toLowerCase() &&
          r.dataNascimento === a.dataNascimento.toISOString()
      );
  }

  incluir(dados: DadosAtendido): ResultadoAtendido {
    const atendido = this.montar(dados);
    const erros = atendido.validar();
    if (Object.keys(erros).length === 0 && this.jaCadastrado(atendido)) {
      erros.nome = 'Atendido já cadastrado (mesmo nome e data de nascimento).';
    }
    if (Object.keys(erros).length > 0) return { sucesso: false, erros };
    this.dao.incluir(atendido);
    return { sucesso: true, erros: {} };
  }

  alterar(id: string, dados: DadosAtendido): ResultadoAtendido {
    const existente = this.dao.buscarPorId(id);
    if (!existente) return { sucesso: false, erros: { geral: 'Atendido não encontrado.' } };
    // a data de cadastro original é preservada
    const atendido = this.montar(dados, id, new Date(existente.dataCadastro));
    const erros = atendido.validar();
    if (Object.keys(erros).length === 0 && this.jaCadastrado(atendido)) {
      erros.nome = 'Já existe outro atendido com esse nome e data de nascimento.';
    }
    if (Object.keys(erros).length > 0) return { sucesso: false, erros };
    this.dao.alterar(atendido);
    return { sucesso: true, erros: {} };
  }

  excluir(id: string): void {
    this.dao.excluir(id);
  }

  /** Devolve os dados de um atendido no formato do formulário, para a edição. */
  obterParaEdicao(id: string): DadosAtendido | undefined {
    const r = this.dao.buscarPorId(id);
    if (!r) return undefined;
    return {
      nome: r.nome,
      dataNascimento: formatarData(r.dataNascimento),
      sexo: r.sexo,
      responsavelLegal: r.responsavelLegal,
    };
  }

  validarFiltro(dados: DadosFiltroAtendido): ErrosValidacao {
    return new FiltroAtendido(dados.nome, dados.sexo, dados.idadeMinima, dados.idadeMaxima).validar();
  }

  /** Consulta com 3 filtros: nome, sexo e faixa de idade. Ordenado por nome. */
  consultar(dados: DadosFiltroAtendido): LinhaAtendido[] {
    const filtro = new FiltroAtendido(dados.nome, dados.sexo, dados.idadeMinima, dados.idadeMaxima);
    if (Object.keys(filtro.validar()).length > 0) return [];
    return this.dao
      .listar()
      .map(paraEntidade)
      .filter((a) => filtro.aceita(a.nome, a.sexo, a.idade()))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
      .map((a) => ({
        id: a.id,
        nome: a.nome,
        dataNascimento: formatarData(a.dataNascimento.toISOString()),
        idade: a.idade(),
        sexo: a.sexo,
        responsavelLegal: a.responsavelLegal,
        dataCadastro: formatarData(a.dataCadastro.toISOString()),
      }));
  }
}
