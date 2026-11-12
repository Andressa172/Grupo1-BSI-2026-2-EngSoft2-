import { describe, expect, it } from 'vitest';
import { Usuario, validarCPF, formatarCPF } from './Usuario';
import { FiltroUsuario } from './FiltroUsuario';

describe('Model Usuario - RF_B2 Gerenciar Funcionários / Autenticação', () => {
  it('aceita um usuário válido com CPF formatado ou apenas dígitos', () => {
    const usuario = new Usuario({
      nome: 'Gerente SOS Criança',
      login: 'gerente',
      senhaHash: 'demo',
      perfil: 'GERENTE',
      cpf: '529.982.247-25',
    });
    expect(usuario.validar()).toEqual({});
    expect(usuario.isAtivo()).toBe(true);
    expect(usuario.getCpf()).toBe('52998224725');
  });

  it('valida dígitos verificadores e formato do CPF', () => {
    expect(validarCPF('52998224725')).toBe(true);
    expect(validarCPF('529.982.247-25')).toBe(true);
    expect(validarCPF('111.111.111-11')).toBe(false);
    expect(validarCPF('529.982.247-00')).toBe(false);
    expect(validarCPF('123')).toBe(false);
    expect(formatarCPF('52998224725')).toBe('529.982.247-25');
  });

  it('rejeita nome em branco ou muito curto', () => {
    const usuarioVazio = new Usuario({
      nome: '   ',
      login: 'gerente',
      senhaHash: 'demo',
      perfil: 'GERENTE',
      cpf: '52998224725',
    });
    expect(usuarioVazio.validar()).toHaveProperty('nome');

    const usuarioCurto = new Usuario({
      nome: 'Ab',
      login: 'gerente',
      senhaHash: 'demo',
      perfil: 'GERENTE',
      cpf: '52998224725',
    });
    expect(usuarioCurto.validar()).toHaveProperty('nome');
  });

  it('rejeita login em branco, curto ou com espaços', () => {
    const semLogin = new Usuario({
      nome: 'Gerente',
      login: '',
      senhaHash: 'demo',
      perfil: 'GERENTE',
      cpf: '52998224725',
    });
    expect(semLogin.validar()).toHaveProperty('login');

    const comEspaco = new Usuario({
      nome: 'Gerente',
      login: 'gerente sos',
      senhaHash: 'demo',
      perfil: 'GERENTE',
      cpf: '52998224725',
    });
    expect(comEspaco.validar()).toHaveProperty('login');
  });

  it('rejeita senha em branco no cadastro, mas aceita senha opcional na edição', () => {
    const usuario = new Usuario({
      nome: 'Gerente',
      login: 'gerente',
      senhaHash: '',
      perfil: 'GERENTE',
      cpf: '52998224725',
    });
    expect(usuario.validar()).toHaveProperty('senha');
    expect(usuario.validar({ senhaOpcional: true })).toEqual({});
  });

  it('rejeita perfil inválido', () => {
    const usuario = new Usuario({
      nome: 'Gerente',
      login: 'gerente',
      senhaHash: 'demo',
      // @ts-expect-error forçando um valor inválido para testar a validação
      perfil: 'INVALIDO',
      cpf: '52998224725',
    });
    expect(usuario.validar()).toHaveProperty('perfil');
  });

  it('rejeita CPF ausente ou inválido', () => {
    const semCpf = new Usuario({
      nome: 'Gerente',
      login: 'gerente',
      senhaHash: 'demo',
      perfil: 'GERENTE',
      cpf: '',
    });
    expect(semCpf.validar()).toHaveProperty('cpf');

    const cpfInvalido = new Usuario({
      nome: 'Gerente',
      login: 'gerente',
      senhaHash: 'demo',
      perfil: 'GERENTE',
      cpf: '111.111.111-11',
    });
    expect(cpfInvalido.validar()).toHaveProperty('cpf');
  });

  it('omite senhaHash e formata CPF em paraDadosPublicos', () => {
    const usuario = new Usuario({
      id: 1,
      nome: 'Gerente SOS Criança',
      login: 'gerente',
      senhaHash: 'demo',
      perfil: 'GERENTE',
      cpf: '52998224725',
    });
    const publico = usuario.paraDadosPublicos();
    expect(publico).toEqual({
      id: 1,
      nome: 'Gerente SOS Criança',
      login: 'gerente',
      perfil: 'GERENTE',
      cpf: '529.982.247-25',
      ativo: true,
    });
    expect('senhaHash' in publico).toBe(false);
  });

  it('valida FiltroUsuario corretamente', () => {
    expect(new FiltroUsuario({ nome: 'Maria', perfil: 'GERENTE', status: 'ATIVO' }).validar()).toEqual({});
    expect(new FiltroUsuario({ perfil: 'INVALIDO' }).validar()).toHaveProperty('perfil');
    expect(new FiltroUsuario({ status: 'OUTRO' }).validar()).toHaveProperty('status');
  });
});
