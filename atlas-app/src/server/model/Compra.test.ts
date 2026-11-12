// Testes de unidade dos Models Compra, ItemCompra e FiltroCompra (RF_F2): só validação e cálculo, sem banco.
import { describe, expect, it } from 'vitest';
import { Compra } from './Compra';
import { FiltroCompra } from './FiltroCompra';

const hojeBR = () => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};
const item = (dados: Record<string, unknown> = {}) => ({ produtoId: 1, quantidade: '2', valorUnitario: '10,50', ...dados });
const compra = (dados: Record<string, unknown> = {}) =>
  new Compra({ numeroNF: '000123', dataCompra: hojeBR(), fornecedor: 'Atacadão', itens: [item()], ...dados });

describe('Compra - validação (passos 1 a 5 e fluxos 1.1, 2.1, 3.1, 4.1, 5.1)', () => {
  it('compra válida não tem erros', () => {
    expect(compra().validar()).toEqual({});
  });

  it('1.1 dados gerais incompletos ou inválidos', () => {
    const erros = new Compra({ numeroNF: '', dataCompra: '', fornecedor: ' ', itens: [item()] }).validar();
    expect(Object.keys(erros).sort()).toEqual(['dataCompra', 'fornecedor', 'numeroNF']);
    expect(compra({ dataCompra: '31/02/2026' }).validar()).toHaveProperty('dataCompra');
    expect(compra({ dataCompra: '01/01/2999' }).validar()).toHaveProperty('dataCompra');
    expect(compra({ fornecedor: 'x'.repeat(121) }).validar()).toHaveProperty('fornecedor');
    expect(compra({ fornecedor: 'Linha\nquebrada' }).validar()).toHaveProperty('fornecedor');
  });

  it('2.1 nota fiscal em formato inválido', () => {
    for (const numeroNF of ['NF@1', "1'; DROP TABLE compra; --", '<script>', '-123', 'x'.repeat(61), 42]) {
      expect(compra({ numeroNF }).validar()).toHaveProperty('numeroNF');
    }
    for (const numeroNF of ['000.123.456', 'NF-e 1234/1', 'abc123']) {
      expect(compra({ numeroNF }).validar()).toEqual({});
    }
  });

  it('a nota é normalizada (maiúsculas e espaços) para a checagem de duplicidade', () => {
    expect(compra({ numeroNF: '  nf-e   10 ' }).paraLinhaDeDados().numeroNF).toBe('NF-E 10');
  });

  it('3.1 / 4.1 dados do item inválidos ficam no campo do item', () => {
    const erros = compra({
      itens: [item(), item({ produtoId: 'x', quantidade: '0', valorUnitario: '-1', dataValidade: '99/99/2030' })],
    }).validar();
    expect(Object.keys(erros).sort()).toEqual(['item.1.dataValidade', 'item.1.produto', 'item.1.quantidade', 'item.1.valorUnitario']);
  });

  it.each(['0,00', 'abc', '', '1.000.000,01', null])('valor unitário inválido: %s', (valorUnitario) => {
    expect(compra({ itens: [item({ valorUnitario })] }).validar()).toHaveProperty('item.0.valorUnitario');
  });

  it('validade anterior à data da compra = produto já vencido', () => {
    expect(compra({ dataCompra: '10/11/2026', itens: [item({ dataValidade: '09/11/2026' })] }).validar()).toHaveProperty(
      'item.0.dataValidade'
    );
    expect(compra({ dataCompra: '10/11/2026', itens: [item({ dataValidade: '10/11/2026' })] }).validar()).toEqual({});
  });

  it('5.1 nenhum item; itens fora do formato; itens demais', () => {
    expect(compra({ itens: [] }).validar()).toHaveProperty('itens');
    expect(compra({ itens: 'não é lista' }).validar()).toHaveProperty('itens');
    expect(compra({ itens: undefined }).validar()).toHaveProperty('itens');
    expect(compra({ itens: Array.from({ length: 101 }, () => item()) }).validar()).toHaveProperty('itens');
  });

  it('total acima do que o banco guarda (NUMERIC 12,2) é recusado', () => {
    const itens = Array.from({ length: 100 }, () => item({ quantidade: '1000000', valorUnitario: '1.000.000,00' }));
    expect(compra({ itens }).validar()).toHaveProperty('itens');
  });
});

describe('Compra - cálculo do total (passos 4 e 6)', () => {
  it('soma em centavos, sem erro de ponto flutuante', () => {
    const c = compra({ itens: [item({ quantidade: '1', valorUnitario: '0,10' }), item({ quantidade: '1', valorUnitario: '0,20' })] });
    expect(c.getValorTotal()).toBe(0.3);
  });

  it('quantidade × valor unitário por item', () => {
    const c = compra({ itens: [item({ quantidade: '3', valorUnitario: '1.234,56' }), item({ quantidade: 2, valorUnitario: 0.99 })] });
    expect(c.getValorTotal()).toBe(3705.66);
  });
});

describe('FiltroCompra - validação', () => {
  it('filtro vazio é válido', () => {
    const f = new FiltroCompra({});
    expect(f.validar()).toEqual({});
    expect([f.getNumeroNF(), f.getFornecedor(), f.getDataInicial(), f.getDataFinal()]).toEqual(['', '', null, null]);
  });

  it('% e _ digitados são procurados como texto (escapados para o ILIKE)', () => {
    expect(new FiltroCompra({ fornecedor: '100%_ok' }).getFornecedor()).toBe('100\\%\\_ok');
  });

  it('datas inválidas, invertidas e textos longos', () => {
    expect(new FiltroCompra({ dataInicial: 'ontem' }).validar()).toHaveProperty('dataInicial');
    expect(new FiltroCompra({ dataInicial: '10/11/2026', dataFinal: '01/11/2026' }).validar()).toHaveProperty('dataFinal');
    expect(new FiltroCompra({ fornecedor: 'x'.repeat(121) }).validar()).toHaveProperty('fornecedor');
  });
});
