// Testes de validação dos Models de doação (RF_F3 e RF_F11), sem banco.
import { describe, expect, it } from 'vitest';
import { DoacaoProduto } from './DoacaoProduto';
import { DoacaoDinheiro } from './DoacaoDinheiro';
import { FiltroDoacao } from './FiltroDoacao';
import { SelecaoDoador } from './SelecaoDoador';
import { Doador } from './Doador';
import { ItemDoacao } from './ItemDoacao';

const item = { produtoId: 1, quantidade: '5', dataValidade: '' };

// o Controller cria os ItemDoacao e entrega ao Model; o teste faz o mesmo
const doacaoProduto = (atributos: { itens?: unknown; dataRecebimento?: string }) =>
  new DoacaoProduto(atributos as never, Array.isArray(atributos.itens) ? atributos.itens.map((i) => new ItemDoacao(i)) : []);

describe('DoacaoProduto.validar (RF_F3)', () => {
  const base = { dataRecebimento: '01/10/2026', itens: [item] };

  it('aceita uma doação correta', () => {
    expect(doacaoProduto(base).validar()).toEqual({});
  });

  it('sem nada preenchido mostra os erros de doador, data e itens', () => {
    const erros = doacaoProduto({}).validar();
    expect(Object.keys(erros).sort()).toEqual(['dataRecebimento', 'itens']);
  });

  it('fluxo 5.1/5.2: produto e quantidade inválidos', () => {
    const erros = doacaoProduto({
      ...base,
      itens: [{ produtoId: '', quantidade: '' }, { produtoId: 1, quantidade: '0' }, { produtoId: 1, quantidade: '2,5' }],
    }).validar();
    expect(erros['item.0.produto']).toBeDefined();
    expect(erros['item.0.quantidade']).toBeDefined();
    expect(erros['item.1.quantidade']).toBeDefined();
    expect(erros['item.2.quantidade']).toBeDefined();
  });

  it('fluxo 5.3: validade inválida ou anterior ao recebimento', () => {
    const erros = doacaoProduto({
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
    expect(doacaoProduto({ ...base, dataRecebimento: '01/01/2999' }).validar()).toHaveProperty('dataRecebimento');
    expect(doacaoProduto({ ...base, dataRecebimento: '31/02/2026' }).validar()).toHaveProperty('dataRecebimento');
  });

  it('limita o número de itens e rejeita itens que não são lista', () => {
    expect(doacaoProduto({ ...base, itens: Array.from({ length: 101 }, () => item) }).validar()).toHaveProperty('itens');
    expect(doacaoProduto({ ...base, itens: 'x' as unknown as unknown[] }).validar()).toHaveProperty('itens');
    expect(doacaoProduto({ ...base, itens: [] }).validar()).toHaveProperty('itens');
  });
});

describe('DoacaoDinheiro.validar (RF_F11)', () => {
  const base = { valor: '150,50', formaRecebimento: 'PIX', dataRecebimento: '01/10/2026' };

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

describe('SelecaoDoador.validar (RF_F3 / RF_F11) - o Controller entrega os erros do Model Doador', () => {
  // o Controller cria o Doador a partir da escolha e passa o resultado de Doador.validar() para a seleção
  const v = (dados: unknown) => {
    const selecao = new SelecaoDoador(dados);
    const novo = selecao.isNovo() ? new Doador(selecao.getDadosNovoDoador()) : null;
    return selecao.validar(novo?.validar());
  };
  const completo = { tipo: 'novo', nome: 'José Santos', contato: '(18) 99999-0000', email: 'jose@exemplo.com', tipoPessoa: 'FISICA', cpfCnpj: '529.982.247-25' };

  it('anônimo e existente passam; sem escolha ou id inválido não', () => {
    expect(v({ tipo: 'anonimo' })).toEqual({});
    expect(v({ tipo: 'existente', id: 1 })).toEqual({});
    expect(v({ tipo: 'existente', id: 'abc' })).toHaveProperty('doador');
    expect(v(undefined)).toHaveProperty('doador');
  });

  it('novo exige nome, telefone, e-mail e CPF/CNPJ válido', () => {
    expect(v(completo)).toEqual({});
    expect(v({ tipo: 'novo', nome: 'Jo', contato: '123' })).toMatchObject({
      'doador.nome': expect.any(String), 'doador.contato': expect.any(String), 'doador.cpfCnpj': expect.any(String),
    });
    expect(v({ ...completo, cpfCnpj: '' })).toHaveProperty(['doador.cpfCnpj']);
    expect(v({ ...completo, cpfCnpj: '111.111.111-11' })).toHaveProperty(['doador.cpfCnpj']);
    expect(v({ ...completo, cpfCnpj: '529.982.247-26' })).toHaveProperty(['doador.cpfCnpj']);
    expect(v({ ...completo, email: 'maria@' })).toHaveProperty(['doador.email']);
    expect(v({ ...completo, tipoPessoa: 'JURIDICA', cpfCnpj: '11.222.333/0001-81' })).toEqual({});
    expect(v({ ...completo, tipoPessoa: 'JURIDICA' })).toHaveProperty(['doador.cpfCnpj']); // CPF não vale para pessoa jurídica
  });

  it('não instancia nem busca nada sozinha: só entrega os dados do doador novo', () => {
    const s = new SelecaoDoador(completo);
    expect(s.isNovo()).toBe(true);
    expect(s.getDadosNovoDoador()).toMatchObject({ nome: 'José Santos', cpfCnpj: '529.982.247-25', tipoPessoa: 'FISICA' });
  });
});

describe('DoacaoDinheiro.validarCaixa (RF_F6)', () => {
  const base = { valor: '10,00', formaRecebimento: 'Dinheiro', dataRecebimento: '10/10/2026' };
  const caixaAbertoEm = (dia: string) => `${dia}T08:00:00-03:00`; // a data de abertura que o Controller entrega

  it('sem caixa aberto → erro "caixa"', () => {
    expect(new DoacaoDinheiro(base).validarCaixa(null)).toHaveProperty('caixa');
  });
  it('data anterior ao dia de abertura → erro na data; no dia da abertura ou depois, passa', () => {
    expect(new DoacaoDinheiro(base).validarCaixa(caixaAbertoEm('2026-10-11'))).toHaveProperty('dataRecebimento');
    expect(new DoacaoDinheiro(base).validarCaixa(caixaAbertoEm('2026-10-10'))).toEqual({});
    expect(new DoacaoDinheiro(base).validarCaixa(caixaAbertoEm('2026-10-01'))).toEqual({});
  });
  it('dinheiro entra no caixa físico; PIX e transferência, no digital', () => {
    expect(new DoacaoDinheiro(base).getFormaPagCaixa()).toBe('FISICO');
    expect(new DoacaoDinheiro({ ...base, formaRecebimento: 'PIX' }).getFormaPagCaixa()).toBe('DIGITAL');
    expect(new DoacaoDinheiro({ ...base, formaRecebimento: 'Transferência' }).getFormaPagCaixa()).toBe('DIGITAL');
  });
});

describe('FiltroDoacao.validar', () => {
  it('vazio é válido; aceita doador e período corretos', () => {
    expect(new FiltroDoacao().validar()).toEqual({});
    expect(new FiltroDoacao({ doadorId: '3', dataInicial: '01/10/2026', dataFinal: '31/10/2026' }).validar()).toEqual({});
  });

  it('aceita "anonimo" como doador (só as doações de doador anônimo)', () => {
    const filtro = new FiltroDoacao({ doadorId: 'anonimo' });
    expect(filtro.validar()).toEqual({});
    expect(filtro.isSomenteAnonimos()).toBe(true);
    expect(filtro.getDoadorId()).toBeNull();
    expect(new FiltroDoacao({ doadorId: '3' }).isSomenteAnonimos()).toBe(false);
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
