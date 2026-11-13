import { describe, expect, it } from 'vitest';
import { AlocacaoRecurso } from './AlocacaoRecurso';

describe('Model AlocacaoRecurso - RF_F9', () => {
  it('aceita um recurso do tipo produto válido', () => {
    const recurso = new AlocacaoRecurso({ tipo: 'PRODUTO', produtoId: 1, quantidade: 5 });
    expect(recurso.validar()).toEqual({});
  });

  it('aceita um recurso financeiro válido', () => {
    const recurso = new AlocacaoRecurso({ tipo: 'FINANCEIRO', valor: 150 });
    expect(recurso.validar()).toEqual({});
  });

  it('rejeita tipo ausente ou inválido', () => {
    const recurso = new AlocacaoRecurso({});
    expect(new AlocacaoRecurso({}).validar()).toHaveProperty('tipo');
    expect(recurso.validar()).toHaveProperty('tipo');
  });

  it('rejeita recurso produto sem produtoId', () => {
    const recurso = new AlocacaoRecurso({ tipo: 'PRODUTO', quantidade: 1 });
    expect(recurso.validar()).toHaveProperty('produtoId');
  });

  it('rejeita recurso produto com quantidade zero ou negativa', () => {
    expect(new AlocacaoRecurso({ tipo: 'PRODUTO', produtoId: 1, quantidade: 0 }).validar()).toHaveProperty('quantidade');
    expect(new AlocacaoRecurso({ tipo: 'PRODUTO', produtoId: 1, quantidade: -1 }).validar()).toHaveProperty('quantidade');
  });

  it('rejeita recurso financeiro sem valor', () => {
    const recurso = new AlocacaoRecurso({ tipo: 'FINANCEIRO' });
    expect(recurso.validar()).toHaveProperty('valor');
  });

  it('rejeita recurso financeiro com valor zero ou negativo', () => {
    expect(new AlocacaoRecurso({ tipo: 'FINANCEIRO', valor: 0 }).validar()).toHaveProperty('valor');
    expect(new AlocacaoRecurso({ tipo: 'FINANCEIRO', valor: -10 }).validar()).toHaveProperty('valor');
  });

  it('paraLinhaDeDados só leva produtoId/quantidade para PRODUTO e valor para FINANCEIRO', () => {
    const produto = new AlocacaoRecurso({ tipo: 'PRODUTO', produtoId: 1, quantidade: 3 }).paraLinhaDeDados();
    expect(produto.valor).toBeNull();
    const financeiro = new AlocacaoRecurso({ tipo: 'FINANCEIRO', valor: 50 }).paraLinhaDeDados();
    expect(financeiro.produtoId).toBeNull();
    expect(financeiro.quantidade).toBeNull();
  });
});
