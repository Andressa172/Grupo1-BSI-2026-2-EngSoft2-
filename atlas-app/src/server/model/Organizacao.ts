import { validarCNPJ } from '@/lib/cnpj';
import { ErroValidacao } from '../erros';
import type { ExecutorSQL } from '../dao/tipos';
import { OrganizacaoDAO } from '../dao/OrganizacaoDAO';

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
    if (this.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) {
      throw new ErroValidacao('Formato de e-mail inválido.');
    }
    if (this.cnpj && !validarCNPJ(this.cnpj)) {
      throw new ErroValidacao('CNPJ inválido.');
    }
    if (this.telefone) {
      const digitosTel = this.telefone.replace(/\D/g, '');
      if (digitosTel.length !== 10 && digitosTel.length !== 11) {
        throw new ErroValidacao('O telefone deve conter 10 ou 11 dígitos numéricos.');
      }
    }
    if (this.endereco && this.endereco.length > 255) {
      throw new ErroValidacao('O endereço completo deve ter no máximo 255 caracteres.');
    }
  }

  // ------------------------------ persistência ------------------------------
  // O Model cria o OrganizacaoDAO com a conexão que recebe do Controller.

  /** Organização cadastrada (registro id = 1), ou null se a tabela está vazia. */
  static async obter(conexao: ExecutorSQL): Promise<Organizacao | null> {
    return new OrganizacaoDAO(conexao).obter();
  }

  /** Grava (insere ou atualiza) e devolve a organização salva. */
  async salvar(conexao: ExecutorSQL): Promise<Organizacao> {
    return new OrganizacaoDAO(conexao).salvar(this);
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