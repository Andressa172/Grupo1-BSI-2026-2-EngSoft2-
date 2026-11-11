// Testes de validação dos Models de doação (RF_F3 e RF_F11), sem banco.
import { describe, expect, it } from 'vitest';
import { DoacaoProduto } from './DoacaoProduto';
import { DoacaoDinheiro } from './DoacaoDinheiro';
import { FiltroDoacao } from './FiltroDoacao';

const doadorExistente = { tipo: 'existente', id: 1 };
const item = { produtoId: 1, quantidade: '5', dataValidade: '' };

describe('DoacaoProduto.validar (RF_F3)', () => {
  const base = { doador: doadorExistente, dataRecebimento: '01/10/2026', itens: [item] };

  it('aceita uma doação correta', () => {
    expect(new DoacaoProduto(base).validar()).toEqual({});
  });

  it('sem nada preenchido mostra os erros de doador, data e itens', () => {
    const erros = new DoacaoProduto({}).validar();
    expect(Object.keys(erros).sort()).toEqual(['dataRecebimento', 'doador', 'itens']);
  });

  it('fluxo 5.1/5.2: produto e quantidade inválidos', () => {
    const erros = new DoacaoProduto({
      ...base,
      itens: [{ produtoId: '', quantidade: '' }, { produtoId: 1, quantidade: '0' }, { produtoId: 1, quantidade: '2,5' }],
    }).validar();
    expect(erros['item.0.produto']).toBeDefined();
    expect(erros['item.0.quantidade']).toBeDefined();
    expect(erros['item.1.quantidade']).toBeDefined();
    expect(erros['item.2.quantidade']).toBeDefined();
  });

  it('fluxo 5.3: validade inválida ou anterior ao recebimento', () => {
    const erros = new DoacaoProduto({
      ...base,
      itens: [
        { ...item, dataValidade: '31/02/2027' },
        { ...item, dataValidade: '01/09/2026' },
        { ...item, dataValidade: '01/12/2026' },
      ],
    }).validar();
    expect(erros['item.0.dataValidade']).toBeDefined();
    expect(erros['item.1.dataValidade']).toBeDefined();
    expect(erros['item.2.dataValidade']).toBeUndefined();
  });

  it('data de recebimento futura ou inválida', () => {
    expect(new DoacaoProduto({ ...base, dataRecebimento: '01/01/2999' }).validar()).toHaveProperty('dataRecebimento');
    expect(new DoacaoProduto({ ...base, dataRecebimento: '31/02/2026' }).validar()).toHaveProperty('dataRecebimento');
  });

  it('doador: novo exige nome e telefone; anônimo e existente passam', () => {
    const v = (doador: unknown) => new DoacaoProduto({ ...base, doador }).validar();
    expect(v({ tipo: 'anonimo' })).toEqual({});
    expect(v({ tipo: 'novo', nome: 'Jo', contato: '123' })).toMatchObject({ 'doador.nome': expect.any(String), 'doador.contato': expect.any(String) });
    expect(v({ tipo: 'novo', nome: 'José Santos', contato: '(18) 99999-0000' })).toEqual({});
    expect(v({ tipo: 'existente', id: 'abc' })).toHaveProperty('doador');
    expect(v(undefined)).toHaveProperty('doador');
  });

  it('limita o número de itens e rejeita itens que não são lista', () => {
    expect(new DoacaoProduto({ ...base, itens: Array.from({ length: 101 }, () => item) }).validar()).toHaveProperty('itens');
    expect(new DoacaoProduto({ ...base, itens: 'x' as unknown as unknown[] }).validar()).toHaveProperty('itens');
    expect(new DoacaoProduto({ ...base, itens: [] }).validar()).toHaveProperty('itens');
  });
});

describe('DoacaoDinheiro.validar (RF_F11)', () => {
  const base = { doador: doadorExistente, valor: '150,50', formaRecebimento: 'PIX', dataRecebimento: '01/10/2026' };

  it('aceita uma doação correta e entende "1.234,56"', () => {
    expect(new DoacaoDinheiro(base).validar()).toEqual({});
    expect(new DoacaoDinheiro({ ...base, valor: '1.234,56' }).getValor()).toBe(1234.56);
  });

  it.each(['', '0', '0,00', '-5', 'abc', '10,999', '1.000.000,01', '5; DROP TABLE x'])('rejeita valor inválido: "%s"', (valor) => {
    expect(new DoacaoDinheiro({ ...base, valor }).validar()).toHaveProperty('valor');
  });

  it('forma de recebimento só aceita as três opções', () => {
    expect(new DoacaoDinheiro({ ...base, formaRecebimento: 'Bitcoin' }).validar()).toHaveProperty('formaRecebimento');
    expect(new DoacaoDinheiro({ ...base, formaRecebimento: '' }).validar()).toHaveProperty('formaRecebimento');
  });

  it('data futura ou inválida', () => {
    expect(new DoacaoDinheiro({ ...base, dataRecebimento: '01/01/2999' }).validar()).toHaveProperty('dataRecebimento');
    expect(new DoacaoDinheiro({ ...base, dataRecebimento: '00/00/0000' }).validar()).toHaveProperty('dataRecebimento');
  });
});

describe('FiltroDoacao.validar', () => {
  it('vazio é válido; aceita doador e período corretos', () => {
    expect(new FiltroDoacao().validar()).toEqual({});
    expect(new FiltroDoacao({ doadorId: '3', dataInicial: '01/10/2026', dataFinal: '31/10/2026' }).validar()).toEqual({});
  });

  it('rejeita doador não numérico (tentativa de injeção), data inválida e período invertido', () => {
    expect(new FiltroDoacao({ doadorId: '1 OR 1=1' }).validar()).toHaveProperty('doadorId');
    expect(new FiltroDoacao({ doadorId: '1; DROP TABLE doador' }).validar()).toHaveProperty('doadorId');
    expect(new FiltroDoacao({ doadorId: '99999999999' }).validar()).toHaveProperty('doadorId');
    expect(new FiltroDoacao({ dataInicial: '31/02/2026' }).validar()).toHaveProperty('dataInicial');
    expect(new FiltroDoacao({ dataFinal: "2026-01-01'; --" }).validar()).toHaveProperty('dataFinal');
    expect(new FiltroDoacao({ dataInicial: '10/10/2026', dataFinal: '01/10/2026' }).validar()).toHaveProperty('dataFinal');
  });
});
