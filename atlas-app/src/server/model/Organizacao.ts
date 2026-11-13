import { ErroValidacao } from '../erros';

export interface OrganizacaoAtributos {
  id?: number;
  nomeFantasia: string;
  cnpj?: string | null;
  endereco?: string | null;
  telefone?: string | null;
  email?: string | null;
  caminhoLogo?: string | null;
}

export class Organizacao {
  private id?: number;
  private nomeFantasia: string;
  private cnpj: string | null;
  private endereco: string | null;
  private telefone: string | null;
  private email: string | null;
  private caminhoLogo: string | null;

  constructor(atributos: OrganizacaoAtributos) {
    this.id = atributos.id ?? 1;
    this.nomeFantasia = atributos.nomeFantasia?.trim() ?? '';
    this.cnpj = atributos.cnpj?.trim() ?? null;
    this.endereco = atributos.endereco?.trim() ?? null;
    this.telefone = atributos.telefone?.trim() ?? null;
    this.email = atributos.email?.trim() ?? null;
    this.caminhoLogo = atributos.caminhoLogo ?? null;
  }

  getId(): number | undefined { return this.id; }
  getNomeFantasia(): string { return this.nomeFantasia; }
  getCnpj(): string | null { return this.cnpj; }
  getEndereco(): string | null { return this.endereco; }
  getTelefone(): string | null { return this.telefone; }
  getEmail(): string | null { return this.email; }
  getCaminhoLogo(): string | null { return this.caminhoLogo; }

  validar(): void {
    if (!this.nomeFantasia) {
      throw new ErroValidacao('O nome da organização é obrigatório.');
    }
    if (this.nomeFantasia.length > 120) {
      throw new ErroValidacao('O nome da organização deve ter no máximo 120 caracteres.');
    }
    if (this.nomeFantasia.length < 3) {
      throw new ErroValidacao('O nome da organização deve ter pelo menos 3 caracteres.');
    }
    if (this.email && !this.email.includes('@')) {
      throw new ErroValidacao('Formato de e-mail inválido.');
    }
    if (this.cnpj && this.cnpj.replace(/\D/g, '').length !== 14) {
      throw new ErroValidacao('O CNPJ deve conter exatamente 14 dígitos numéricos.');
    }
  }

  paraLinhaDeDados() {
    return {
      id: this.id,
      nomeFantasia: this.nomeFantasia,
      cnpj: this.cnpj,
      endereco: this.endereco,
      telefone: this.telefone,
      email: this.email,
      caminhoLogo: this.caminhoLogo,
    };
  }
}