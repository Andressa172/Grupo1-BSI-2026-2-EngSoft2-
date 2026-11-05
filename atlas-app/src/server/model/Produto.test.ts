import { describe, expect, it } from 'vitest';
import { Produto } from './Produto';
import { ErroValidacao } from '../erros';

const valido = { nome: 'Arroz 5kg', categoria: 'Alimento', unidadeMedida: 'pacote', estoqueMinimo: 10 };

describe('Model Produto - RF_B3 Gerenciar produtos', () => {
  it('aceita um produto válido', () => {
    expect(() => new Produto(valido).validar()).not.toThrow();
  });

  it('começa com quantidade em estoque zero', () => {
    expect(new Produto(valido).getQuantidadeEstoque()).toBe(0);
  });

  it('rejeita nome em branco', () => {
    expect(() => new Produto({ ...valido, nome: '   ' }).validar()).toThrow(ErroValidacao);
  });

  it('rejeita nome maior que 120 caracteres', () => {
    expect(() => new Produto({ ...valido, nome: 'a'.repeat(121) }).validar()).toThrow(ErroValidacao);
  });

  it('rejeita unidade de medida em branco', () => {
    expect(() => new Produto({ ...valido, unidadeMedida: '' }).validar()).toThrow(ErroValidacao);
  });

  it('rejeita categoria em branco', () => {
    expect(() => new Produto({ ...valido, categoria: '' }).validar()).toThrow(ErroValidacao);
  });

  it('rejeita estoque mínimo negativo', () => {
    expect(() => new Produto({ ...valido, estoqueMinimo: -1 }).validar()).toThrow(ErroValidacao);
  });

  it('trata data de validade vazia como sem validade', () => {
    expect(new Produto({ ...valido, dataValidade: '' }).getDataValidade()).toBeNull();
  });
});
