import { describe, expect, it, beforeEach } from 'vitest';
import { UsuarioController } from './UsuarioController';
import { Usuario, limparCPF } from './model/Usuario';
import { ErroAutenticacao, ErroValidacao } from './erros';
import type { UsuarioDAO } from './dao/UsuarioDAO';

function criarUsuarioDAOFalso() {
  let proximoId = 3;
  const usuarios: Usuario[] = [
    new Usuario({
      id: 1,
      nome: 'Gerente SOS Criança',
      login: 'gerente',
      senhaHash: 'demo',
      perfil: 'GERENTE',
      cpf: '52998224725',
      ativo: true,
    }),
    new Usuario({
      id: 2,
      nome: 'Usuário Inativo',
      login: 'inativo',
      senhaHash: 'demo',
      perfil: 'FUNCIONARIO',
      cpf: '11144477735',
      ativo: false,
    }),
  ];

  const dao = {
    async buscarPorLogin(login: string) {
      return usuarios.find((u) => u.getLogin() === login) ?? null;
    },
    async listarTodos() {
      return [...usuarios];
    },
    async existeComLogin(login: string, idIgnorado?: number) {
      return usuarios.some((u) => u.getId() !== idIgnorado && u.getLogin().toLowerCase() === login.toLowerCase());
    },
    async existeComCpf(cpf: string, idIgnorado?: number) {
      const limpo = limparCPF(cpf);
      return usuarios.some((u) => u.getId() !== idIgnorado && u.getCpf() === limpo);
    },
    async inserir(usuario: Usuario) {
      usuario.setId(proximoId++);
      usuarios.push(usuario);
      return usuario;
    },
  };

  return dao as unknown as UsuarioDAO;
}

describe('UsuarioController - Autenticação e RF_B2 Gerenciar Funcionários', () => {
  let controller: UsuarioController;

  beforeEach(() => {
    controller = new UsuarioController(criarUsuarioDAOFalso());
  });

  it('autentica usuário com credenciais válidas', async () => {
    const usuario = await controller.autenticar('gerente', 'demo');
    expect(usuario.getId()).toBe(1);
    expect(usuario.getLogin()).toBe('gerente');
    expect(usuario.getPerfil()).toBe('GERENTE');
  });

  it('rejeita login ou senha vazios com ErroValidacao', async () => {
    await expect(controller.autenticar('', 'demo')).rejects.toThrow(ErroValidacao);
    await expect(controller.autenticar('gerente', '')).rejects.toThrow(ErroValidacao);
  });

  it('rejeita usuário inexistente com ErroAutenticacao', async () => {
    await expect(controller.autenticar('naoexiste', 'demo')).rejects.toThrow(ErroAutenticacao);
  });

  it('rejeita senha incorreta com ErroAutenticacao', async () => {
    await expect(controller.autenticar('gerente', 'errada')).rejects.toThrow(ErroAutenticacao);
  });

  it('rejeita usuário inativo com ErroAutenticacao', async () => {
    await expect(controller.autenticar('inativo', 'demo')).rejects.toThrow(ErroAutenticacao);
  });

  it('cadastra um novo funcionário válido', async () => {
    const novo = await controller.cadastrar({
      nome: 'Novo Funcionário',
      login: 'novo.func',
      senha: '123',
      perfil: 'FUNCIONARIO',
      cpf: '123.456.789-09',
    });
    expect(novo.getId()).toBeDefined();
    expect(novo.getCpf()).toBe('12345678909');
  });

  it('rejeita cadastro com login duplicado', async () => {
    await expect(
      controller.cadastrar({
        nome: 'Outro Gerente',
        login: 'GERENTE',
        senha: '123',
        perfil: 'GERENTE',
        cpf: '123.456.789-09',
      })
    ).rejects.toThrow(ErroValidacao);
  });

  it('rejeita cadastro com CPF duplicado', async () => {
    await expect(
      controller.cadastrar({
        nome: 'Outro Funcionário',
        login: 'outro.login',
        senha: '123',
        perfil: 'FUNCIONARIO',
        cpf: '529.982.247-25',
      })
    ).rejects.toThrow(ErroValidacao);
  });

  it('rejeita cadastro com CPF inválido', async () => {
    await expect(
      controller.cadastrar({
        nome: 'Outro Funcionário',
        login: 'outro.login',
        senha: '123',
        perfil: 'FUNCIONARIO',
        cpf: '111.111.111-11',
      })
    ).rejects.toThrow(ErroValidacao);
  });
});
