import { describe, expect, it } from 'vitest';
import { Doador } from './Doador';
import { ErroValidacao } from '../erros';

describe('Model Doador - RF_B4 Gerenciar Doadores', () => {
  it('aceita um doador válido', () => {
    const doador = new Doador({ nome: 'Maria Aparecida', contato: '(18) 99999-1234' });
    expect(() => doador.validar()).not.toThrow();
  });

  it('rejeita nome em branco', () => {
    const doador = new Doador({ nome: '' });
    expect(() => doador.validar()).toThrow(ErroValidacao);
  });

  it('rejeita nome contendo apenas espaços', () => {
    const doador = new Doador({ nome: '   ' });
    expect(() => doador.validar()).toThrow(ErroValidacao);
  });

  it('rejeita nome maior que 120 caracteres', () => {
    const doador = new Doador({ nome: 'a'.repeat(121) });
    expect(() => doador.validar()).toThrow(ErroValidacao);
  });

  it('rejeita tipo de pessoa inválido', () => {
    const doador = new Doador({ nome: 'Empresa X' });
    // @ts-expect-error forçando um valor inválido para testar a validação
    doador.setTipoPessoa('INVALIDO');
    expect(() => doador.validar()).toThrow(ErroValidacao);
  });

  it('doador anônimo dispensa nome e contato (fluxo alternativo da ERS)', () => {
    const doador = new Doador({ nome: '', anonimo: true });
    expect(() => doador.validar()).not.toThrow();
  });

  it('normaliza nome e contato com trim', () => {
    const doador = new Doador({ nome: '  Maria  ', contato: '  (18) 99999-1234  ' });
    expect(doador.getNome()).toBe('Maria');
    expect(doador.getContato()).toBe('(18) 99999-1234');
  });

  it('contato vazio vira null', () => {
    const doador = new Doador({ nome: 'Maria', contato: '   ' });
    expect(doador.getContato()).toBeNull();
  });
});
