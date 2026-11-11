// Model - Atendido (RF_B1 - Gerenciar atendidos)
// Guarda os dados do atendido, valida os próprios atributos e faz a persistência
// criando o AtendidoDAO com a conexão que recebe do Controller (Controller -> Model -> DAO).
import type { ErrosDeCampo } from '../erros';
import type { ExecutorSQL } from '../dao/tipos';
import { AtendidoDAO } from '../dao/AtendidoDAO';
import type { FiltroAtendido } from './FiltroAtendido';
import { dataValida, hoje, paraIso, parseData, textoSeguro } from './datasBR';

export const SEXOS = ['Feminino', 'Masculino'] as const;

// letras (com acento), espaço, apóstrofo, ponto e hífen
const NOME_VALIDO = /^[\p{L}][\p{L}\s'.-]*$/u;

export interface AtendidoAtributos {
  id?: number;
  nome: string;
  // "dd/mm/aaaa" (vem da tela) ou "aaaa-mm-dd" (vem do banco)
  dataNascimento: string;
  sexo: string;
  responsavelLegal: string;
  // só existe depois de cadastrado
  dataCadastro?: string;
}

export class Atendido {
  private id?: number;
  private nome: string;
  private dataNascimento: Date;
  private sexo: string;
  private responsavelLegal: string;
  private dataCadastro: Date;

  constructor(atributos: AtendidoAtributos) {
    this.id = atributos.id;
    this.nome = textoSeguro(atributos.nome);
    this.dataNascimento = parseData(atributos.dataNascimento);
    this.sexo = textoSeguro(atributos.sexo);
    this.responsavelLegal = textoSeguro(atributos.responsavelLegal);
    this.dataCadastro = atributos.dataCadastro ? parseData(atributos.dataCadastro) : hoje();
  }

  // ------------------------------- get / set -------------------------------

  getId(): number | undefined {
    return this.id;
  }

  setId(id: number): void {
    this.id = id;
  }

  getNome(): string {
    return this.nome;
  }

  setNome(nome: string): void {
    this.nome = textoSeguro(nome);
  }

  getDataNascimento(): Date {
    return this.dataNascimento;
  }

  setDataNascimento(texto: string): void {
    this.dataNascimento = parseData(texto);
  }

  getSexo(): string {
    return this.sexo;
  }

  setSexo(sexo: string): void {
    this.sexo = textoSeguro(sexo);
  }

  getResponsavelLegal(): string {
    return this.responsavelLegal;
  }

  setResponsavelLegal(responsavel: string): void {
    this.responsavelLegal = textoSeguro(responsavel);
  }

  // a data de cadastro não tem setter: é definida quando o atendido é cadastrado
  getDataCadastro(): Date {
    return this.dataCadastro;
  }

  /** Idade em anos completos na data de referência (padrão: hoje). */
  idade(referencia: Date = hoje()): number {
    if (!dataValida(this.dataNascimento)) return 0;
    let anos = referencia.getUTCFullYear() - this.dataNascimento.getUTCFullYear();
    const aindaNaoFezAniversario =
      referencia.getUTCMonth() < this.dataNascimento.getUTCMonth() ||
      (referencia.getUTCMonth() === this.dataNascimento.getUTCMonth() &&
        referencia.getUTCDate() < this.dataNascimento.getUTCDate());
    if (aindaNaoFezAniversario) anos--;
    return anos;
  }

  // ------------------------------- validação -------------------------------

  /** Devolve campo -> mensagem com TODOS os erros (mapa vazio = atendido válido). */
  validar(): ErrosDeCampo {
    const erros: ErrosDeCampo = {};

    if (this.nome.length < 3) {
      erros.nome = 'Nome inválido: informe ao menos 3 caracteres.';
    } else if (this.nome.length > 120) {
      erros.nome = 'O nome deve ter no máximo 120 caracteres.';
    } else if (!NOME_VALIDO.test(this.nome)) {
      erros.nome = 'Nome inválido: use apenas letras, espaços, apóstrofo, ponto ou hífen.';
    }

    if (!dataValida(this.dataNascimento)) {
      erros.dataNascimento = 'Informe uma data de nascimento válida (dd/mm/aaaa).';
    } else if (this.dataNascimento.getTime() > hoje().getTime()) {
      erros.dataNascimento = 'A data de nascimento não pode estar no futuro.';
    } else if (this.idade() > 120) {
      erros.dataNascimento = 'Data de nascimento inválida: idade acima de 120 anos.';
    }

    if (!(SEXOS as readonly string[]).includes(this.sexo)) {
      erros.sexo = 'Selecione o sexo.';
    }

    if (this.responsavelLegal.length < 3) {
      erros.responsavelLegal = 'Informe o nome do responsável legal (ao menos 3 caracteres).';
    } else if (this.responsavelLegal.length > 120) {
      erros.responsavelLegal = 'O nome do responsável deve ter no máximo 120 caracteres.';
    } else if (!NOME_VALIDO.test(this.responsavelLegal)) {
      erros.responsavelLegal = 'Nome inválido: use apenas letras, espaços, apóstrofo, ponto ou hífen.';
    }

    return erros;
  }

  // ------------------------------ persistência ------------------------------
  // O Model cria o DAO usando a conexão que o Controller abriu.

  async incluir(conexao: ExecutorSQL): Promise<void> {
    const salvo = await new AtendidoDAO(conexao).inserir(this);
    this.id = salvo.getId();
    this.dataCadastro = salvo.getDataCadastro();
  }

  async alterar(conexao: ExecutorSQL): Promise<boolean> {
    const salvo = await new AtendidoDAO(conexao).atualizar(this);
    return salvo !== null;
  }

  async excluir(conexao: ExecutorSQL): Promise<boolean> {
    if (this.id === undefined) return false;
    return new AtendidoDAO(conexao).excluir(this.id);
  }

  /** Regra de negócio: não pode haver dois atendidos com o mesmo nome e data de nascimento. */
  async existeOutroIgual(conexao: ExecutorSQL): Promise<boolean> {
    return new AtendidoDAO(conexao).existeIgual(this.nome, paraIso(this.dataNascimento), this.id);
  }

  static async buscarPorId(conexao: ExecutorSQL, id: number): Promise<Atendido | null> {
    return new AtendidoDAO(conexao).buscarPorId(id);
  }

  static async consultar(conexao: ExecutorSQL, filtro: FiltroAtendido): Promise<Atendido[]> {
    return new AtendidoDAO(conexao).consultar(filtro);
  }

  paraLinhaDeDados() {
    return {
      id: this.id,
      nome: this.nome,
      dataNascimento: dataValida(this.dataNascimento) ? paraIso(this.dataNascimento) : '',
      idade: this.idade(),
      sexo: this.sexo,
      responsavelLegal: this.responsavelLegal,
      dataCadastro: paraIso(this.dataCadastro),
    };
  }
}
