import { describe, expect, it } from 'vitest';
import { ItemCardapio } from './ItemCardapio';
import { ErroValidacao } from '../erros';

describe('Model ItemCardapio - RF_F10 Criar Cardápio Diário', () => {
  it('aceita um item válido', () => {
    const item = new ItemCardapio({ produtoId: 1, quantidadeUtilizada: 3 });
    expect(() => item.validar()).not.toThrow();
  });

  it('rejeita item sem produto selecionado (ERS 5.1)', () => {
    const item = new ItemCardapio({ produtoId: 0, quantidadeUtilizada: 3 });
    expect(() => item.validar()).toThrow(ErroValidacao);
  });

  it('rejeita quantidade zero ou negativa (ERS 5.2)', () => {
    const item = new ItemCardapio({ produtoId: 1, quantidadeUtilizada: 0 });
    expect(() => item.validar()).toThrow(ErroValidacao);
  });
});
