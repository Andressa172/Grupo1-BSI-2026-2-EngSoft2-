import { describe, expect, it } from 'vitest';
import { AlocacaoRecurso } from './AlocacaoRecurso';

function amanha(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

describe('Model AlocacaoRecurso - RF_F9', () => {
  it('aceita um recurso do tipo produto válido', () => {
    const recurso = new AlocacaoRecurso({ tipo: 'PRODUTO', produtoId: 1, quantidade: 5 });
    expect(recurso.validar()).toEqual({});
  });

  it('aceita um recurso financeiro válido', () => {
    const recurso = new AlocacaoRecurso({ tipo: 'FINANCEIRO', valor: 150, dataPagamento: amanha() });
    expect(recurso.validar()).toEqual({});
  });

  it('rejeita recurso financeiro sem data de pagamento', () => {
    const recurso = new AlocacaoRecurso({ tipo: 'FINANCEIRO', valor: 150 });
    expect(recurso.validar()).toHaveProperty('dataPagamento');
  });

  it('aceita descrição opcional para recurso financeiro e leva no paraLinhaDeDados', () => {
    const comDescricao = new AlocacaoRecurso({ tipo: 'FINANCEIRO', valor: 150, dataPagamento: amanha(), descricao: 'Som e luz' });
    expect(comDescricao.validar()).toEqual({});
    expect(comDescricao.paraLinhaDeDados().descricao).toBe('Som e luz');

    const semDescricao = new AlocacaoRecurso({ tipo: 'FINANCEIRO', valor: 150, dataPagamento: amanha() });
    expect(semDescricao.validar()).toEqual({});
    expect(semDescricao.paraLinhaDeDados().descricao).toBeNull();
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
    expect(produto.dataPagamento).toBeNull();
    const financeiro = new AlocacaoRecurso({ tipo: 'FINANCEIRO', valor: 50, dataPagamento: amanha() }).paraLinhaDeDados();
    expect(financeiro.produtoId).toBeNull();
    expect(financeiro.quantidade).toBeNull();
  });
});
