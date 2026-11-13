import { describe, expect, it } from 'vitest';
import { Doador } from './Doador';

const CPF_VALIDO = '52998224725';
const CNPJ_VALIDO = '12345678000195';
const DADOS_VALIDOS = { nome: 'Maria Aparecida', telefone: '(18) 99999-1234', email: 'maria@gmail.com', cpfCnpj: CPF_VALIDO };

describe('Model Doador - RF_B4 Gerenciar Doadores', () => {
  it('aceita um doador válido', () => {
    const doador = new Doador(DADOS_VALIDOS);
    expect(doador.validar()).toEqual({});
  });

  it('rejeita nome em branco', () => {
    const doador = new Doador({ ...DADOS_VALIDOS, nome: '' });
    expect(doador.validar()).toHaveProperty('nome');
  });

  it('rejeita nome contendo apenas espaços', () => {
    const doador = new Doador({ ...DADOS_VALIDOS, nome: '   ' });
    expect(doador.validar()).toHaveProperty('nome');
  });

  it('rejeita nome maior que 120 caracteres', () => {
    const doador = new Doador({ ...DADOS_VALIDOS, nome: 'a'.repeat(121) });
    expect(doador.validar()).toHaveProperty('nome');
  });

  it('rejeita tipo de pessoa inválido', () => {
    const doador = new Doador({ ...DADOS_VALIDOS, nome: 'Empresa X', cpfCnpj: CNPJ_VALIDO });
    // @ts-expect-error forçando um valor inválido para testar a validação
    doador.setTipoPessoa('INVALIDO');
    expect(doador.validar()).toHaveProperty('tipoPessoa');
  });

  it('doador anônimo dispensa nome, telefone, e-mail e documento (fluxo alternativo da ERS)', () => {
    const doador = new Doador({ nome: '', anonimo: true });
    expect(doador.validar()).toEqual({});
  });

  it('exige CPF para pessoa física (modelo Pessoa do MER)', () => {
    const doador = new Doador({ ...DADOS_VALIDOS, tipoPessoa: 'FISICA', cpfCnpj: undefined });
    expect(doador.validar()).toHaveProperty('cpfCnpj');
  });

  it('rejeita CPF com dígito verificador inválido', () => {
    const doador = new Doador({ ...DADOS_VALIDOS, tipoPessoa: 'FISICA', cpfCnpj: '11111111111' });
    expect(doador.validar()).toHaveProperty('cpfCnpj');
  });

  it('exige CNPJ para pessoa jurídica (modelo Pessoa do MER)', () => {
    const doador = new Doador({ ...DADOS_VALIDOS, nome: 'Empresa X', tipoPessoa: 'JURIDICA', cpfCnpj: undefined });
    expect(doador.validar()).toHaveProperty('cpfCnpj');
  });

  it('rejeita CNPJ com dígito verificador inválido', () => {
    const doador = new Doador({ ...DADOS_VALIDOS, nome: 'Empresa X', tipoPessoa: 'JURIDICA', cpfCnpj: '11111111000111' });
    expect(doador.validar()).toHaveProperty('cpfCnpj');
  });

  it('aceita CPF/CNPJ formatado (mantém só os dígitos)', () => {
    const doador = new Doador({ ...DADOS_VALIDOS, tipoPessoa: 'FISICA', cpfCnpj: '529.982.247-25' });
    expect(doador.getCpfCnpj()).toBe(CPF_VALIDO);
    expect(doador.validar()).toEqual({});
  });

  it('exige telefone', () => {
    const doador = new Doador({ ...DADOS_VALIDOS, telefone: undefined });
    expect(doador.validar()).toHaveProperty('telefone');
  });

  it('rejeita telefone com menos de 10 dígitos', () => {
    const doador = new Doador({ ...DADOS_VALIDOS, telefone: '123' });
    expect(doador.validar()).toHaveProperty('telefone');
  });

  it('exige e-mail', () => {
    const doador = new Doador({ ...DADOS_VALIDOS, email: undefined });
    expect(doador.validar()).toHaveProperty('email');
  });

  it('rejeita e-mail em formato inválido', () => {
    const doador = new Doador({ ...DADOS_VALIDOS, email: 'maria@' });
    expect(doador.validar()).toHaveProperty('email');
  });

  it('aceita e-mail válido e guarda em minúsculas', () => {
    const doador = new Doador({ ...DADOS_VALIDOS, email: 'Maria@Gmail.com' });
    expect(doador.getEmail()).toBe('maria@gmail.com');
    expect(doador.validar()).toEqual({});
  });

  it('normaliza nome e telefone com trim', () => {
    const doador = new Doador({ ...DADOS_VALIDOS, nome: '  Maria  ', telefone: '  (18) 99999-1234  ' });
    expect(doador.getNome()).toBe('Maria');
    expect(doador.getTelefone()).toBe('(18) 99999-1234');
  });

  it('telefone vazio vira null', () => {
    const doador = new Doador({ ...DADOS_VALIDOS, telefone: '   ' });
    expect(doador.getTelefone()).toBeNull();
  });
});
