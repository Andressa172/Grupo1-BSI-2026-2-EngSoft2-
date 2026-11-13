// Model - Doador (RF_B4)
import type { ErrosDeCampo } from '../erros';
import { cpfOuCnpjValido } from './documentos';

export type TipoPessoa = 'FISICA' | 'JURIDICA';

// bem simples, só pra pegar erro de digitação grosseiro (ex: "maria@" ou "@gmail.com")
const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface DoadorAtributos {
  id?: number;
  nome: string;
  telefone?: string | null;
  email?: string | null;
  cpfCnpj?: string | null;
  tipoPessoa?: TipoPessoa;
  anonimo?: boolean;
}

export class Doador {
  private id?: number;
  private nome: string;
  private telefone: string | null;
  private email: string | null;
  private cpfCnpj: string | null;
  private tipoPessoa: TipoPessoa;
  private anonimo: boolean;

  constructor(atributos: DoadorAtributos) {
    this.id = atributos.id;
    this.nome = atributos.nome?.trim() ?? '';
    this.telefone = atributos.telefone?.trim() || null;
    this.email = atributos.email?.trim().toLowerCase() || null;
    this.cpfCnpj = atributos.cpfCnpj?.replace(/\D/g, '') || null;
    this.tipoPessoa = atributos.tipoPessoa ?? 'FISICA';
    this.anonimo = atributos.anonimo ?? false;
  }

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
    this.nome = nome?.trim() ?? '';
  }

  getTelefone(): string | null {
    return this.telefone;
  }

  setTelefone(telefone: string | null): void {
    this.telefone = telefone?.trim() || null;
  }

  getEmail(): string | null {
    return this.email;
  }

  setEmail(email: string | null): void {
    this.email = email?.trim().toLowerCase() || null;
  }

  getCpfCnpj(): string | null {
    return this.cpfCnpj;
  }

  setCpfCnpj(cpfCnpj: string | null): void {
    this.cpfCnpj = cpfCnpj?.replace(/\D/g, '') || null;
  }

  getTipoPessoa(): TipoPessoa {
    return this.tipoPessoa;
  }

  setTipoPessoa(tipoPessoa: TipoPessoa): void {
    this.tipoPessoa = tipoPessoa;
  }

  isAnonimo(): boolean {
    return this.anonimo;
  }

  setAnonimo(anonimo: boolean): void {
    this.anonimo = anonimo;
  }

  // quem monta o Doador a partir da linha do banco é o próprio model, não o DAO
  static reconstituir(linha: DoadorAtributos): Doador {
    return new Doador(linha);
  }

  // doador anônimo dispensa nome, contato e documento
  validar(): ErrosDeCampo {
    const erros: ErrosDeCampo = {};
    if (this.anonimo) {
      return erros;
    }

    if (!this.nome || this.nome.length === 0) {
      erros.nome = 'Nome inválido: o nome do doador é obrigatório.';
    } else if (this.nome.length > 120) {
      erros.nome = 'Nome inválido: no máximo 120 caracteres.';
    }

    if (this.tipoPessoa !== 'FISICA' && this.tipoPessoa !== 'JURIDICA') {
      erros.tipoPessoa = 'Tipo de pessoa inválido.';
    }

    // pessoa física exige CPF, pessoa jurídica exige CNPJ (modelo Pessoa do MER)
    if (!this.cpfCnpj) {
      erros.cpfCnpj = this.tipoPessoa === 'JURIDICA' ? 'CNPJ inválido: informe o CNPJ.' : 'CPF inválido: informe o CPF.';
    } else if (!cpfOuCnpjValido(this.cpfCnpj, this.tipoPessoa)) {
      erros.cpfCnpj = this.tipoPessoa === 'JURIDICA' ? 'CNPJ inválido.' : 'CPF inválido.';
    }

    if (!this.telefone) {
      erros.telefone = 'Telefone inválido: o telefone é obrigatório.';
    } else if (this.telefone.replace(/\D/g, '').length < 10) {
      erros.telefone = 'Telefone inválido: informe DDD + número.';
    }

    if (!this.email) {
      erros.email = 'E-mail inválido: o e-mail é obrigatório.';
    } else if (!EMAIL_VALIDO.test(this.email)) {
      erros.email = 'E-mail inválido.';
    }

    return erros;
  }

  paraLinhaDeDados() {
    return {
      id: this.id,
      nome: this.nome,
      telefone: this.telefone,
      email: this.email,
      cpfCnpj: this.cpfCnpj,
      tipoPessoa: this.tipoPessoa,
      anonimo: this.anonimo,
    };
  }
}
