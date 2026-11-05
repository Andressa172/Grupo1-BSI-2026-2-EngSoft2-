import { describe, expect, it } from 'vitest';
import { Usuario, validarCPF, formatarCPF } from './Usuario';
import { ErroValidacao } from '../erros';

describe('Model Usuario - RF_B2 Gerenciar Funcionários / Autenticação', () => {
  it('aceita um usuário válido com CPF formatado ou apenas dígitos', () => {
    const usuario = new Usuario({
      nome: 'Gerente SOS Criança',
      login: 'gerente',
      senhaHash: 'demo',
      perfil: 'GERENTE',
      cpf: '529.982.247-25',
    });
    expect(() => usuario.validar()).not.toThrow();
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

  it('rejeita nome em branco', () => {
    const usuario = new Usuario({
      nome: '   ',
      login: 'gerente',
      senhaHash: 'demo',
      perfil: 'GERENTE',
      cpf: '52998224725',
    });
    expect(() => usuario.validar()).toThrow(ErroValidacao);
  });

  it('rejeita login em branco', () => {
    const usuario = new Usuario({
      nome: 'Gerente',
      login: '',
      senhaHash: 'demo',
      perfil: 'GERENTE',
      cpf: '52998224725',
    });
    expect(() => usuario.validar()).toThrow(ErroValidacao);
  });

  it('rejeita senha em branco', () => {
    const usuario = new Usuario({
      nome: 'Gerente',
      login: 'gerente',
      senhaHash: '',
      perfil: 'GERENTE',
      cpf: '52998224725',
    });
    expect(() => usuario.validar()).toThrow(ErroValidacao);
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
    expect(() => usuario.validar()).toThrow(ErroValidacao);
  });

  it('rejeita CPF ausente ou inválido', () => {
    const semCpf = new Usuario({
      nome: 'Gerente',
      login: 'gerente',
      senhaHash: 'demo',
      perfil: 'GERENTE',
      cpf: '',
    });
    expect(() => semCpf.validar()).toThrow(ErroValidacao);

    const cpfInvalido = new Usuario({
      nome: 'Gerente',
      login: 'gerente',
      senhaHash: 'demo',
      perfil: 'GERENTE',
      cpf: '111.111.111-11',
    });
    expect(() => cpfInvalido.validar()).toThrow(ErroValidacao);
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
});
