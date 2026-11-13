// Model - Usuario (RF_B2 - Gerenciar Funcionários e Autenticação)
// Guarda os dados do funcionário/usuário, valida os próprios atributos e faz a
// persistência criando o UsuarioDAO com a conexão que recebe do UsuarioController.
import type { ErrosDeCampo } from '../erros';
import type { ExecutorSQL } from '../dao/tipos';
import { UsuarioDAO } from '../dao/UsuarioDAO';
import type { FiltroUsuario } from './FiltroUsuario';

export const PERFIS_USUARIO = ['GERENTE', 'SECRETARIO', 'FUNCIONARIO'] as const;

export type PerfilUsuario = (typeof PERFIS_USUARIO)[number];

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

  // ------------------------------- validação -------------------------------

  /**
   * Valida os atributos do funcionário. Devolve um mapa campo -> mensagem com
   * TODOS os erros encontrados (mapa vazio = funcionário válido).
   */
  validar(opcoes?: { senhaOpcional?: boolean }): ErrosDeCampo {
    const erros: ErrosDeCampo = {};

    if (!this.nome || this.nome.length === 0) {
      erros.nome = 'O nome do funcionário é obrigatório.';
    } else if (this.nome.length < 3) {
      erros.nome = 'O nome do funcionário deve ter ao menos 3 caracteres.';
    } else if (this.nome.length > 120) {
      erros.nome = 'O nome do funcionário deve ter no máximo 120 caracteres.';
    }

    if (!this.cpfBruto) {
      erros.cpf = 'O CPF do funcionário é obrigatório.';
    } else if (!validarCPF(this.cpfBruto)) {
      erros.cpf = 'O CPF informado é inválido.';
    }

    if (!this.login || this.login.length === 0) {
      erros.login = 'O login do funcionário é obrigatório.';
    } else if (this.login.length < 3) {
      erros.login = 'O login do funcionário deve ter ao menos 3 caracteres.';
    } else if (this.login.length > 60) {
      erros.login = 'O login do funcionário deve ter no máximo 60 caracteres.';
    } else if (/\s/.test(this.login)) {
      erros.login = 'O login não pode conter espaços em branco.';
    }

    const senhaLimpa = this.senhaHash.trim();
    if (!opcoes?.senhaOpcional && senhaLimpa.length === 0) {
      erros.senha = 'A senha do funcionário é obrigatória.';
    } else if (senhaLimpa.length > 0 && senhaLimpa.length < 3) {
      erros.senha = 'A senha deve ter ao menos 3 caracteres.';
    }

    if (!(PERFIS_USUARIO as readonly string[]).includes(this.perfil)) {
      erros.perfil = 'Selecione um cargo válido.';
    }

    return erros;
  }

  // ------------------------------ persistência ------------------------------
  // O Model cria o UsuarioDAO usando a conexão que o Controller abriu.

  async incluir(conexao: ExecutorSQL): Promise<void> {
    const salvo = await new UsuarioDAO(conexao).inserir(this);
    this.id = salvo.getId();
  }

  async alterar(conexao: ExecutorSQL): Promise<boolean> {
    const salvo = await new UsuarioDAO(conexao).atualizar(this);
    return salvo !== null;
  }

  async excluir(conexao: ExecutorSQL): Promise<boolean> {
    if (this.id === undefined) return false;
    return new UsuarioDAO(conexao).excluir(this.id);
  }

  async existeOutroComMesmoLogin(conexao: ExecutorSQL): Promise<boolean> {
    return new UsuarioDAO(conexao).existeComLogin(this.login, this.id);
  }

  async existeOutroComMesmoCpf(conexao: ExecutorSQL): Promise<boolean> {
    if (!this.cpf) return false;
    return new UsuarioDAO(conexao).existeComCpf(this.cpf, this.id);
  }

  static async buscarPorId(conexao: ExecutorSQL, id: number): Promise<Usuario | null> {
    return new UsuarioDAO(conexao).buscarPorId(id);
  }

  static async buscarPorLogin(conexao: ExecutorSQL, login: string): Promise<Usuario | null> {
    return new UsuarioDAO(conexao).buscarPorLogin(login);
  }

  static async consultar(conexao: ExecutorSQL, filtro: FiltroUsuario): Promise<Usuario[]> {
    return new UsuarioDAO(conexao).consultar(filtro);
  }

  static async contarGerentesAtivos(conexao: ExecutorSQL, idIgnorado?: number): Promise<number> {
    return new UsuarioDAO(conexao).contarGerentesAtivos(idIgnorado);
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
