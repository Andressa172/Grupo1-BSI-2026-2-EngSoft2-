// Model - Usuario (RF_B2)
import { ErroValidacao } from '../erros';

export type PerfilUsuario = 'GERENTE' | 'SECRETARIO' | 'FUNCIONARIO';

const PERFIS_VALIDOS: PerfilUsuario[] = ['GERENTE', 'SECRETARIO', 'FUNCIONARIO'];

export function limparCPF(cpf: string): string {
  return (cpf ?? '').replace(/\D/g, '');
}

export function formatarCPF(cpf: string): string {
  const digitos = limparCPF(cpf).slice(0, 11);
  if (digitos.length <= 3) return digitos;
  if (digitos.length <= 6) return `${digitos.slice(0, 3)}.${digitos.slice(3)}`;
  if (digitos.length <= 9) return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6)}`;
  return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9, 11)}`;
}

export function validarCPF(cpf: string): boolean {
  const texto = (cpf ?? '').trim();
  const formatoAceito = /^\d{11}$|^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(texto);
  if (!formatoAceito) {
    return false;
  }

  const digitos = limparCPF(texto);
  if (digitos.length !== 11 || /^(\d)\1{10}$/.test(digitos)) {
    return false;
  }

  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += Number(digitos[i]) * (10 - i);
  }
  let primeiroDigito = (soma * 10) % 11;
  if (primeiroDigito === 10) primeiroDigito = 0;
  if (primeiroDigito !== Number(digitos[9])) {
    return false;
  }

  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += Number(digitos[i]) * (11 - i);
  }
  let segundoDigito = (soma * 10) % 11;
  if (segundoDigito === 10) segundoDigito = 0;
  return segundoDigito === Number(digitos[10]);
}

export interface UsuarioAtributos {
  id?: number;
  nome: string;
  login: string;
  senhaHash: string;
  perfil: PerfilUsuario;
  cpf?: string | null;
  ativo?: boolean;
}

export class Usuario {
  private id?: number;
  private nome: string;
  private login: string;
  private senhaHash: string;
  private perfil: PerfilUsuario;
  private cpf: string | null;
  private ativo: boolean;
  private cpfBruto: string;

  constructor(atributos: UsuarioAtributos) {
    this.id = atributos.id;
    this.nome = atributos.nome?.trim() ?? '';
    this.login = atributos.login?.trim() ?? '';
    this.senhaHash = atributos.senhaHash ?? '';
    this.perfil = atributos.perfil;
    this.cpfBruto = atributos.cpf?.trim() ?? '';
    this.cpf = this.cpfBruto ? limparCPF(this.cpfBruto) : null;
    this.ativo = atributos.ativo ?? true;
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

  getLogin(): string {
    return this.login;
  }

  setLogin(login: string): void {
    this.login = login?.trim() ?? '';
  }

  getSenhaHash(): string {
    return this.senhaHash;
  }

  setSenhaHash(senhaHash: string): void {
    this.senhaHash = senhaHash ?? '';
  }

  getPerfil(): PerfilUsuario {
    return this.perfil;
  }

  setPerfil(perfil: PerfilUsuario): void {
    this.perfil = perfil;
  }

  getCpf(): string | null {
    return this.cpf;
  }

  setCpf(cpf: string | null): void {
    this.cpfBruto = cpf?.trim() ?? '';
    this.cpf = this.cpfBruto ? limparCPF(this.cpfBruto) : null;
  }

  isAtivo(): boolean {
    return this.ativo;
  }

  setAtivo(ativo: boolean): void {
    this.ativo = ativo;
  }

  validar(): void {
    if (!this.nome || this.nome.length === 0) {
      throw new ErroValidacao('O nome do funcionário é obrigatório.');
    }
    if (this.nome.length > 120) {
      throw new ErroValidacao('O nome do funcionário deve ter no máximo 120 caracteres.');
    }
    if (!this.login || this.login.length === 0) {
      throw new ErroValidacao('O login do funcionário é obrigatório.');
    }
    if (this.login.length > 60) {
      throw new ErroValidacao('O login do funcionário deve ter no máximo 60 caracteres.');
    }
    if (!this.senhaHash || this.senhaHash.trim().length === 0) {
      throw new ErroValidacao('A senha do funcionário é obrigatória.');
    }
    if (!PERFIS_VALIDOS.includes(this.perfil)) {
      throw new ErroValidacao('Cargo inválido.');
    }
    if (!this.cpfBruto) {
      throw new ErroValidacao('O CPF do funcionário é obrigatório.');
    }
    if (!validarCPF(this.cpfBruto)) {
      throw new ErroValidacao('O CPF informado é inválido.');
    }
  }

  paraLinhaDeDados() {
    return {
      id: this.id,
      nome: this.nome,
      login: this.login,
      senhaHash: this.senhaHash,
      perfil: this.perfil,
      cpf: this.cpf,
      ativo: this.ativo,
    };
  }

  paraDadosPublicos() {
    return {
      id: this.id,
      nome: this.nome,
      login: this.login,
      perfil: this.perfil,
      cpf: this.cpf ? formatarCPF(this.cpf) : null,
      ativo: this.ativo,
    };
  }
}
