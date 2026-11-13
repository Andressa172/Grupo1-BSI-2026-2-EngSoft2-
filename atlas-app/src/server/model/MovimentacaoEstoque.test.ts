// Testes de unidade do Model MovimentacaoEstoque e do FiltroMovimentacao (RF_F1): só validação, sem banco.
import { describe, expect, it } from 'vitest';
import { MovimentacaoEstoque } from './MovimentacaoEstoque';
import { FiltroMovimentacao } from './FiltroMovimentacao';
import { ErroValidacao } from '../erros';
import { AtualizarEstoqueController } from '../AtualizarEstoqueController';

const mov = (dados: Record<string, unknown>) =>
  new MovimentacaoEstoque({ produtoId: 1, tipo: 'ENTRADA', quantidade: 5, origem: 'Doação de produto #1', ...dados });

describe('MovimentacaoEstoque - validação (passo 1: produto, quantidade e tipo)', () => {
  it('entrada e saída válidas não têm erros', () => {
    expect(mov({}).validar()).toEqual({});
    expect(mov({ tipo: 'saida', quantidade: 3 }).validar()).toEqual({});
    expect(mov({ dataValidade: new Date(Date.UTC(2030, 11, 31, 12)) }).validar()).toEqual({});
    expect(mov({ dataValidade: '31/12/2030' }).validar()).toEqual({});
  });

  it.each([0, -1, 1.5, 'abc', '', null, 1_000_001, Number.NaN])('quantidade inválida: %s', (quantidade) => {
    expect(mov({ quantidade }).validar()).toHaveProperty('quantidade');
  });

  it.each([0, -3, 'x', '1 OR 1=1', 2_147_483_648, null])('produto inválido: %s', (produtoId) => {
    expect(mov({ produtoId }).validar()).toHaveProperty('produtoId');
  });

  it.each(['', 'AJUSTE', 'DELETE', null, 5])('tipo inválido: %s', (tipo) => {
    expect(mov({ tipo }).validar()).toHaveProperty('tipo');
  });

  it('origem é obrigatória e cabe na coluna do banco (255)', () => {
    expect(mov({ origem: '' }).validar()).toHaveProperty('origem');
    expect(mov({ origem: 42 }).validar()).toHaveProperty('origem');
    expect(mov({ origem: 'x'.repeat(256) }).validar()).toHaveProperty('origem');
    expect(mov({ origem: 'x'.repeat(255) }).validar()).toEqual({});
  });

  it('validade: só na entrada e precisa ser uma data real', () => {
    expect(mov({ tipo: 'SAIDA', dataValidade: '31/12/2030' }).validar()).toHaveProperty('dataValidade');
    expect(mov({ dataValidade: '31/02/2030' }).validar()).toHaveProperty('dataValidade');
    expect(mov({ dataValidade: new Date(NaN) }).validar()).toHaveProperty('dataValidade');
  });

  it('atualizarEstoque() recusa movimentação inválida antes de tocar no banco', async () => {
    const conexaoQueNaoPodeSerUsada = {
      query: () => {
        throw new Error('não deveria chegar ao banco');
      },
    };
    await expect(
      AtualizarEstoqueController.getInstancia().atualizarEstoque(conexaoQueNaoPodeSerUsada, {
        produtoId: 1,
        tipo: 'ENTRADA',
        quantidade: 0,
        origem: 'x',
      })
    ).rejects.toThrow(ErroValidacao);
    await expect(MovimentacaoEstoque.registrarSaida(conexaoQueNaoPodeSerUsada, 1, -5, 'x')).rejects.toThrow(ErroValidacao);
  });
});

describe('FiltroMovimentacao - validação', () => {
  it('filtro vazio é válido e traz tudo', () => {
    const f = new FiltroMovimentacao({});
    expect(f.validar()).toEqual({});
    expect([f.getProdutoId(), f.getTipo(), f.getDataInicial(), f.getDataFinal()]).toEqual([null, null, null, null]);
  });

  it('converte datas e tipo', () => {
    const f = new FiltroMovimentacao({ produtoId: '7', tipo: 'saida', dataInicial: '01/11/2026', dataFinal: '2026-11-30' });
    expect(f.validar()).toEqual({});
    expect([f.getProdutoId(), f.getTipo(), f.getDataInicial(), f.getDataFinal()]).toEqual([7, 'SAIDA', '2026-11-01', '2026-11-30']);
  });

  it('recusa valores maliciosos ou inválidos', () => {
    const erros = new FiltroMovimentacao({
      produtoId: '1; DROP TABLE produto; --',
      tipo: "ENTRADA' OR '1'='1",
      dataInicial: '99/99/9999',
      dataFinal: 'ontem',
    }).validar();
    expect(Object.keys(erros).sort()).toEqual(['dataFinal', 'dataInicial', 'produtoId', 'tipo']);
  });

  it('data final antes da inicial', () => {
    expect(new FiltroMovimentacao({ dataInicial: '10/11/2026', dataFinal: '01/11/2026' }).validar()).toHaveProperty('dataFinal');
  });
});
