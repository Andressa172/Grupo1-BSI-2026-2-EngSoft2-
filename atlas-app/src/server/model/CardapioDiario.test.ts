import { describe, expect, it } from 'vitest';
import { CardapioDiario } from './CardapioDiario';

function amanha(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

const ITEM_VALIDO = { produtoId: 1, quantidadeUtilizada: 2 };

describe('Model CardapioDiario - RF_F10 Criar Cardápio Diário', () => {
  it('aceita um cardápio válido', () => {
    const cardapio = new CardapioDiario({ data: amanha(), tipoRefeicao: 'ALMOCO', itens: [ITEM_VALIDO] });
    expect(cardapio.validar()).toEqual({});
  });

  it('rejeita data inválida', () => {
    const cardapio = new CardapioDiario({ data: 'não é data', tipoRefeicao: 'ALMOCO', itens: [ITEM_VALIDO] });
    expect(cardapio.validar()).toHaveProperty('data');
  });

  it('permite data anterior à atual (cadastro retroativo; a tela só avisa)', () => {
    const cardapio = new CardapioDiario({ data: '01/01/2000', tipoRefeicao: 'ALMOCO', itens: [ITEM_VALIDO] });
    expect(cardapio.validar()).not.toHaveProperty('data');
  });

  it('rejeita tipo de refeição ausente ou inválido', () => {
    expect(new CardapioDiario({ data: amanha(), tipoRefeicao: '', itens: [ITEM_VALIDO] }).validar()).toHaveProperty('tipoRefeicao');
    expect(new CardapioDiario({ data: amanha(), tipoRefeicao: 'LANCHE_DA_TARDE', itens: [ITEM_VALIDO] }).validar()).toHaveProperty(
      'tipoRefeicao'
    );
  });

  it('rejeita cardápio sem itens', () => {
    const cardapio = new CardapioDiario({ data: amanha(), tipoRefeicao: 'ALMOCO', itens: [] });
    expect(cardapio.validar()).toHaveProperty('itens');
  });

  it('rejeita item sem produto (erro vem prefixado com o índice)', () => {
    const cardapio = new CardapioDiario({ data: amanha(), tipoRefeicao: 'ALMOCO', itens: [{ quantidadeUtilizada: 1 }] });
    expect(cardapio.validar()).toHaveProperty('item.0.produtoId');
  });

  it('rejeita item com quantidade zero ou negativa', () => {
    const cardapio = new CardapioDiario({
      data: amanha(),
      tipoRefeicao: 'ALMOCO',
      itens: [{ produtoId: 1, quantidadeUtilizada: 0 }],
    });
    expect(cardapio.validar()).toHaveProperty('item.0.quantidadeUtilizada');
  });
});
