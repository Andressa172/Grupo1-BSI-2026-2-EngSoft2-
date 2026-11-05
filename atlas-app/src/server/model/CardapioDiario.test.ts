import { describe, expect, it } from 'vitest';
import { CardapioDiario } from './CardapioDiario';
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

describe('Model CardapioDiario - RF_F10 Criar Cardápio Diário', () => {
  it('aceita um cardápio válido', () => {
    const cardapio = new CardapioDiario({ data: amanha(), tipoRefeicao: 'ALMOCO' });
    expect(() => cardapio.validar()).not.toThrow();
  });

  it('rejeita data inválida (ERS 1.1)', () => {
    const cardapio = new CardapioDiario({ data: '2026-99-99', tipoRefeicao: 'ALMOCO' });
    expect(() => cardapio.validar()).toThrow(ErroValidacao);
  });

  it('rejeita data anterior à data atual (ERS 1.1)', () => {
    const cardapio = new CardapioDiario({ data: ontem(), tipoRefeicao: 'ALMOCO' });
    expect(() => cardapio.validar()).toThrow(ErroValidacao);
  });

  it('rejeita tipo de refeição não selecionado/inválido (ERS 1.2)', () => {
    const cardapio = new CardapioDiario({ data: amanha(), tipoRefeicao: '' as never });
    expect(() => cardapio.validar()).toThrow(ErroValidacao);
  });
});
