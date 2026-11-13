import { describe, expect, it } from 'vitest';
import { ItemCardapio } from './ItemCardapio';

describe('Model ItemCardapio - RF_F10', () => {
  it('aceita um item válido', () => {
    const item = new ItemCardapio({ produtoId: 1, quantidadeUtilizada: 3 });
    expect(item.validar()).toEqual({});
  });

  it('rejeita produtoId ausente ou inválido', () => {
    expect(new ItemCardapio({ quantidadeUtilizada: 1 }).validar()).toHaveProperty('produtoId');
    expect(new ItemCardapio({ produtoId: 0, quantidadeUtilizada: 1 }).validar()).toHaveProperty('produtoId');
  });

  it('rejeita quantidade zero, negativa ou ausente', () => {
    expect(new ItemCardapio({ produtoId: 1 }).validar()).toHaveProperty('quantidadeUtilizada');
    expect(new ItemCardapio({ produtoId: 1, quantidadeUtilizada: 0 }).validar()).toHaveProperty('quantidadeUtilizada');
    expect(new ItemCardapio({ produtoId: 1, quantidadeUtilizada: -2 }).validar()).toHaveProperty('quantidadeUtilizada');
  });
});
