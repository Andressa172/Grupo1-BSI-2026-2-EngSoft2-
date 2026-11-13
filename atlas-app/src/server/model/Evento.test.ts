import { describe, expect, it } from 'vitest';
import { Evento } from './Evento';

function amanha(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

const RECURSO_PRODUTO = { tipo: 'PRODUTO', produtoId: 1, quantidade: 2 };
const RECURSO_FINANCEIRO = { tipo: 'FINANCEIRO', valor: 100 };

describe('Model Evento - RF_F9 Alocar Recursos para Eventos', () => {
  it('aceita um evento válido com recurso produto', () => {
    const evento = new Evento({ nome: 'Festa junina', data: amanha(), recursos: [RECURSO_PRODUTO] });
    expect(evento.validar()).toEqual({});
  });

  it('aceita um evento válido com recurso financeiro', () => {
    const evento = new Evento({ nome: 'Festa junina', data: amanha(), recursos: [RECURSO_FINANCEIRO] });
    expect(evento.validar()).toEqual({});
  });

  it('rejeita nome em branco', () => {
    const evento = new Evento({ nome: '', data: amanha(), recursos: [RECURSO_PRODUTO] });
    expect(evento.validar()).toHaveProperty('nome');
  });

  it('rejeita data inválida', () => {
    const evento = new Evento({ nome: 'Evento', data: 'não é data', recursos: [RECURSO_PRODUTO] });
    expect(evento.validar()).toHaveProperty('data');
  });

  it('permite data anterior à atual (cadastro retroativo; a tela só avisa)', () => {
    const evento = new Evento({ nome: 'Evento', data: '01/01/2000', recursos: [RECURSO_PRODUTO] });
    expect(evento.validar()).not.toHaveProperty('data');
  });

  it('rejeita evento sem recursos', () => {
    const evento = new Evento({ nome: 'Evento', data: amanha(), recursos: [] });
    expect(evento.validar()).toHaveProperty('recursos');
  });

  it('rejeita recurso produto sem produtoId (erro vem prefixado com o índice)', () => {
    const evento = new Evento({ nome: 'Evento', data: amanha(), recursos: [{ tipo: 'PRODUTO', quantidade: 1 }] });
    expect(evento.validar()).toHaveProperty('recurso.0.produtoId');
  });

  it('rejeita recurso financeiro sem valor', () => {
    const evento = new Evento({ nome: 'Evento', data: amanha(), recursos: [{ tipo: 'FINANCEIRO' }] });
    expect(evento.validar()).toHaveProperty('recurso.0.valor');
  });

  it('valida múltiplos recursos, cada erro com seu próprio índice', () => {
    const evento = new Evento({
      nome: 'Evento',
      data: amanha(),
      recursos: [{ tipo: 'PRODUTO' }, RECURSO_FINANCEIRO, { tipo: 'PRODUTO' }],
    });
    const erros = evento.validar();
    expect(erros).toHaveProperty('recurso.0.produtoId');
    expect(erros).toHaveProperty('recurso.2.produtoId');
    expect(erros).not.toHaveProperty('recurso.1.valor');
  });
});
