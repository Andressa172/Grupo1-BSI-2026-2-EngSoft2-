import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UsuarioController } from './UsuarioController';
import { Usuario, limparCPF } from './model/Usuario';
import type { FiltroUsuario } from './model/FiltroUsuario';
import { Database } from './db/Database';
import {
  ErroAutenticacao,
  ErroNaoEncontrado,
  ErroRegraDeNegocio,
  ErroValidacao,
} from './erros';

// ------------------------------------------------------------------------------
// Dublês em memória (sem banco de dados real):
// - Database.getInstancia devolve uma conexão falsa para verificar que o Controller
//   a obtém e a repassa ao Model.
// - UsuarioDAO é instanciado pelo Model (`new UsuarioDAO(conexao)`).
// ------------------------------------------------------------------------------

const banco = vi.hoisted(() => ({
  usuarios: [] as Usuario[],
  proximoId: 1,
  idsComVinculo: [] as number[],
  conexoesUsadas: [] as unknown[],
}));

const conexaoFalsa = vi.hoisted(() => ({ query: async () => ({ rows: [], rowCount: 0 }) }));

vi.mock('./db/Database', () => ({
  Database: { getInstancia: vi.fn(() => conexaoFalsa) },
}));

vi.mock('./dao/UsuarioDAO', () => ({
  UsuarioDAO: class {
    constructor(conexao: unknown) {
      banco.conexoesUsadas.push(conexao);
    }

    async buscarPorLogin(login: string) {
      return banco.usuarios.find((u) => u.getLogin().toLowerCase() === login.toLowerCase()) ?? null;
    }

    async buscarPorId(id: number) {
      return banco.usuarios.find((u) => u.getId() === id) ?? null;
    }

    async consultar(filtro: FiltroUsuario) {
      return banco.usuarios.filter((u) => {
        const termo = filtro.getNome().toLowerCase();
        const bateNomeOuLogin =
          !termo ||
          u.getNome().toLowerCase().includes(termo) ||
          u.getLogin().toLowerCase().includes(termo);
        const batePerfil = !filtro.getPerfil() || u.getPerfil() === filtro.getPerfil();
        const bateStatus =
          !filtro.getStatus() ||
          (filtro.getStatus() === 'ATIVO' ? u.isAtivo() : !u.isAtivo());
        return bateNomeOuLogin && batePerfil && bateStatus;
      });
    }

    async existeComLogin(login: string, idIgnorado?: number) {
      return banco.usuarios.some(
        (u) => u.getId() !== idIgnorado && u.getLogin().toLowerCase() === login.toLowerCase()
      );
    }

    async existeComCpf(cpf: string, idIgnorado?: number) {
      const limpo = limparCPF(cpf);
      return banco.usuarios.some((u) => u.getId() !== idIgnorado && u.getCpf() === limpo);
    }

    async contarGerentesAtivos(idIgnorado?: number) {
      return banco.usuarios.filter(
        (u) => u.getId() !== idIgnorado && u.getPerfil() === 'GERENTE' && u.isAtivo()
      ).length;
    }

    async inserir(usuario: Usuario) {
      usuario.setId(banco.proximoId++);
      banco.usuarios.push(usuario);
      return usuario;
    }

    async atualizar(usuario: Usuario) {
      const indice = banco.usuarios.findIndex((u) => u.getId() === usuario.getId());
      if (indice === -1) return null;
      banco.usuarios[indice] = usuario;
      return usuario;
    }

    async excluir(id: number) {
      if (banco.idsComVinculo.includes(id)) {
        throw new ErroRegraDeNegocio(
          'Este funcionário já possui registros vinculados no sistema e não pode ser excluído. Você pode inativá-lo.'
        );
      }
      const indice = banco.usuarios.findIndex((u) => u.getId() === id);
      if (indice === -1) return false;
      banco.usuarios.splice(indice, 1);
      return true;
    }
  },
}));

describe('UsuarioController - Autenticação e RF_B2 Gerenciar Funcionários', () => {
  const controller = UsuarioController.getInstancia();

  beforeEach(() => {
    banco.usuarios = [
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
    banco.proximoId = 3;
    banco.idsComVinculo = [];
    banco.conexoesUsadas = [];
  });

  describe('padrões Singleton e camadas (Control -> Model -> DAO)', () => {
    it('getInstancia devolve sempre a mesma instância', () => {
      expect(UsuarioController.getInstancia()).toBe(controller);
    });

    it('o Controller obtém a conexão pelo Singleton Database', () => {
      expect(Database.getInstancia).toHaveBeenCalled();
    });

    it('o Model cria o DAO usando a conexão do Controller', async () => {
      await controller.consultar();
      expect(banco.conexoesUsadas.length).toBeGreaterThan(0);
      expect(banco.conexoesUsadas.every((c) => c === conexaoFalsa)).toBe(true);
    });
  });

  describe('autenticação (login)', () => {
    it('autentica usuário ativo com credenciais válidas', async () => {
      const usuario = await controller.autenticar('gerente', 'demo');
      expect(usuario.getId()).toBe(1);
      expect(usuario.getLogin()).toBe('gerente');
      expect(usuario.getPerfil()).toBe('GERENTE');
    });

    it('rejeita login ou senha vazios com ErroValidacao por campo', async () => {
      const erro = await controller.autenticar('', '').catch((e) => e);
      expect(erro).toBeInstanceOf(ErroValidacao);
      expect(erro.erros).toHaveProperty('login');
      expect(erro.erros).toHaveProperty('senha');
    });

    it('rejeita usuário inexistente ou senha incorreta com ErroAutenticacao', async () => {
      await expect(controller.autenticar('naoexiste', 'demo')).rejects.toThrow(ErroAutenticacao);
      await expect(controller.autenticar('gerente', 'errada')).rejects.toThrow(ErroAutenticacao);
    });

    it('rejeita usuário inativo informando que está desabilitado para uso', async () => {
      await expect(controller.autenticar('inativo', 'demo')).rejects.toThrow(/inativo/i);
    });
  });

  describe('inclusão e validações', () => {
    it('cadastra um novo funcionário válido', async () => {
      const novo = await controller.cadastrar({
        nome: 'Novo Funcionário',
        login: 'novo.func',
        senha: '123',
        perfil: 'FUNCIONARIO',
        cpf: '123.456.789-09',
      });
      expect(novo.getId()).toBe(3);
      expect(novo.getCpf()).toBe('12345678909');
    });

    it('rejeita cadastro com login duplicado destacando o campo login', async () => {
      const erro = await controller
        .cadastrar({
          nome: 'Outro Gerente',
          login: 'GERENTE',
          senha: '123',
          perfil: 'GERENTE',
          cpf: '123.456.789-09',
        })
        .catch((e) => e);
      expect(erro).toBeInstanceOf(ErroValidacao);
      expect(erro.erros).toHaveProperty('login');
    });

    it('rejeita cadastro com CPF duplicado destacando o campo cpf', async () => {
      const erro = await controller
        .cadastrar({
          nome: 'Outro Funcionário',
          login: 'outro.login',
          senha: '123',
          perfil: 'FUNCIONARIO',
          cpf: '529.982.247-25',
        })
        .catch((e) => e);
      expect(erro).toBeInstanceOf(ErroValidacao);
      expect(erro.erros).toHaveProperty('cpf');
    });
  });

  describe('consulta com filtros', () => {
    it('filtra por nome/login, cargo e status', async () => {
      expect(await controller.consultar()).toHaveLength(2);
      expect(await controller.consultar({ nome: 'gerente' })).toHaveLength(1);
      expect(await controller.consultar({ perfil: 'FUNCIONARIO' })).toHaveLength(1);
      expect(await controller.consultar({ status: 'ATIVO' })).toHaveLength(1);
      expect(await controller.consultar({ status: 'INATIVO' })).toHaveLength(1);
    });
  });

  describe('alteração, inativação e exclusão (proteção do último ADM)', () => {
    it('edita dados e permite manter a senha atual quando enviada em branco', async () => {
      const editado = await controller.editar(2, {
        nome: 'Funcionário Reativado',
        login: 'inativo',
        senha: '',
        perfil: 'SECRETARIO',
        cpf: '111.444.777-35',
        ativo: true,
      });
      expect(editado.getNome()).toBe('Funcionário Reativado');
      expect(editado.getPerfil()).toBe('SECRETARIO');
      expect(editado.isAtivo()).toBe(true);
      expect(editado.getSenhaHash()).toBe('demo');
    });

    it('impede inativar ou alterar o cargo do único Gerente (ADM) ativo', async () => {
      await expect(
        controller.editar(1, {
          nome: 'Gerente SOS Criança',
          login: 'gerente',
          perfil: 'GERENTE',
          cpf: '52998224725',
          ativo: false,
        })
      ).rejects.toThrow(ErroRegraDeNegocio);

      await expect(
        controller.editar(1, {
          nome: 'Gerente SOS Criança',
          login: 'gerente',
          perfil: 'FUNCIONARIO',
          cpf: '52998224725',
          ativo: true,
        })
      ).rejects.toThrow(ErroRegraDeNegocio);
    });

    it('impede excluir o único Gerente (ADM) ativo, mas permite excluir outro funcionário', async () => {
      await expect(controller.excluir(1)).rejects.toThrow(ErroRegraDeNegocio);
      await controller.excluir(2);
      expect(await controller.consultar()).toHaveLength(1);
    });

    it('lança ErroNaoEncontrado ao buscar, editar ou excluir ID inexistente', async () => {
      await expect(controller.buscarPorId(99)).rejects.toThrow(ErroNaoEncontrado);
      await expect(
        controller.editar(99, {
          nome: 'Teste',
          login: 'teste',
          perfil: 'FUNCIONARIO',
          cpf: '12345678909',
        })
      ).rejects.toThrow(ErroNaoEncontrado);
      await expect(controller.excluir(99)).rejects.toThrow(ErroNaoEncontrado);
    });
  });
});
