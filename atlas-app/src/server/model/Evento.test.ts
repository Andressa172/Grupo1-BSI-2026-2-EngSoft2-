import { describe, expect, it } from 'vitest';
import { Evento } from './Evento';
import { ErroValidacao } from '../erros';

// usa horário local pra não pular de dia por causa do fuso
function paraDataLocal(d: Date): string {
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function amanha(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return paraDataLocal(d);
}

function ontem(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return paraDataLocal(d);
}

describe('Model Evento - RF_F9 Alocar Recursos para Eventos', () => {
  it('aceita um evento válido com data futura', () => {
    const evento = new Evento({ nome: 'Festa Junina', data: amanha() });
    expect(() => evento.validar()).not.toThrow();
  });

  it('rejeita nome em branco (ERS 1.1)', () => {
    const evento = new Evento({ nome: '', data: amanha() });
    expect(() => evento.validar()).toThrow(ErroValidacao);
  });

  it('rejeita data em formato inválido (ERS 1.2)', () => {
    const evento = new Evento({ nome: 'Festa Junina', data: '31/12/2026' });
    expect(() => evento.validar()).toThrow(ErroValidacao);
  });

  it('rejeita data anterior à data atual (ERS 1.2)', () => {
    const evento = new Evento({ nome: 'Festa Junina', data: ontem() });
    expect(() => evento.validar()).toThrow(ErroValidacao);
  });

  it('aceita evento sem descrição (campo opcional)', () => {
    const evento = new Evento({ nome: 'Festa Junina', data: amanha() });
    expect(evento.getDescricao()).toBeNull();
  });
});
