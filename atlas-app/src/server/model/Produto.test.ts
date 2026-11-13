import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Produto } from './Produto';
import { FiltroProduto } from './FiltroProduto';

const valido = {
  nome: 'Arroz 5kg',
  categoria: 'Alimento',
  unidadeMedida: 'pacote',
  numeroLote: 'ARZ-2027-01',
  estoqueMinimo: 10,
};

describe('Model Produto - RF_B3 Gerenciar produtos', () => {
  beforeEach(() => {
    // "hoje" fixo em 09/11/2026 para os testes de validade
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 9, 10, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('aceita um produto válido (sem erros)', () => {
    expect(new Produto(valido).validar()).toEqual({});
  });

  it('começa com quantidade em estoque zero', () => {
    expect(new Produto(valido).getQuantidadeEstoque()).toBe(0);
  });

  it('rejeita nome em branco', () => {
    expect(new Produto({ ...valido, nome: '   ' }).validar()).toHaveProperty('nome');
  });

  it('rejeita nome maior que 120 caracteres', () => {
    expect(new Produto({ ...valido, nome: 'a'.repeat(121) }).validar()).toHaveProperty('nome');
  });

  it('rejeita unidade de medida em branco', () => {
    expect(new Produto({ ...valido, unidadeMedida: '' }).validar()).toHaveProperty('unidadeMedida');
  });

  it('rejeita categoria em branco ou fora da lista', () => {
    expect(new Produto({ ...valido, categoria: '' }).validar()).toHaveProperty('categoria');
    expect(new Produto({ ...valido, categoria: 'Eletrônico' }).validar()).toHaveProperty('categoria');
  });

  it('rejeita estoque mínimo negativo, quebrado ou vazio', () => {
    expect(new Produto({ ...valido, estoqueMinimo: -1 }).validar()).toHaveProperty('estoqueMinimo');
    expect(new Produto({ ...valido, estoqueMinimo: 1.5 }).validar()).toHaveProperty('estoqueMinimo');
    expect(new Produto({ ...valido, estoqueMinimo: '' }).validar()).toHaveProperty('estoqueMinimo');
  });

  it('aceita estoque mínimo vindo como texto do formulário', () => {
    const produto = new Produto({ ...valido, estoqueMinimo: '15' });
    expect(produto.validar()).toEqual({});
    expect(produto.getEstoqueMinimo()).toBe(15);
  });

  it('devolve todos os erros de uma vez, um por campo', () => {
    const erros = new Produto({ nome: '', categoria: '', unidadeMedida: '', numeroLote: '', estoqueMinimo: -1 }).validar();
    expect(Object.keys(erros).sort()).toEqual(['categoria', 'estoqueMinimo', 'nome', 'numeroLote', 'unidadeMedida']);
  });

  describe('nº do lote', () => {
    it('é obrigatório', () => {
      expect(new Produto({ ...valido, numeroLote: '' }).validar()).toHaveProperty('numeroLote');
      expect(new Produto({ ...valido, numeroLote: null }).validar()).toHaveProperty('numeroLote');
    });

    it('aceita letras, números, "-", "/" e "."', () => {
      expect(new Produto({ ...valido, numeroLote: 'L-12/2026.A' }).validar()).toEqual({});
    });

    it('rejeita caracteres especiais e mais de 30 caracteres', () => {
      expect(new Produto({ ...valido, numeroLote: 'LOTE #1' }).validar()).toHaveProperty('numeroLote');
      expect(new Produto({ ...valido, numeroLote: 'A'.repeat(31) }).validar()).toHaveProperty('numeroLote');
    });

    it('vai para os dados enviados à tela', () => {
      expect(new Produto(valido).paraLinhaDeDados().numeroLote).toBe('ARZ-2027-01');
    });
  });

  describe('data de validade', () => {
    it('vazia vira "sem validade" e é aceita', () => {
      const produto = new Produto({ ...valido, dataValidade: '' });
      expect(produto.getDataValidade()).toBeNull();
      expect(produto.validar()).toEqual({});
    });

    it('aceita a data de hoje', () => {
      expect(new Produto({ ...valido, dataValidade: '2026-11-09' }).validar()).toEqual({});
    });

    it('aceita data futura', () => {
      expect(new Produto({ ...valido, dataValidade: '2027-03-01' }).validar()).toEqual({});
    });

    it('rejeita data anterior à data atual', () => {
      const erros = new Produto({ ...valido, dataValidade: '2026-11-08' }).validar();
      expect(erros.dataValidade).toBe('A data de validade não pode ser anterior à data atual.');
    });

    it('rejeita data inexistente ou em formato errado', () => {
      expect(new Produto({ ...valido, dataValidade: '2027-02-30' }).validar()).toHaveProperty('dataValidade');
      expect(new Produto({ ...valido, dataValidade: '01/03/2027' }).validar()).toHaveProperty('dataValidade');
    });

    it('na alteração, aceita manter a validade vencida que já estava gravada', () => {
      const produto = new Produto({ ...valido, dataValidade: '2026-11-05' });
      expect(produto.validar('2026-11-05')).toEqual({});
    });

    it('na alteração, rejeita trocar para outra data no passado', () => {
      const produto = new Produto({ ...valido, dataValidade: '2026-11-01' });
      expect(produto.validar('2026-11-05')).toHaveProperty('dataValidade');
    });
  });
});

describe('Model FiltroProduto - consulta de produtos', () => {
  it('aceita filtro vazio (traz todos)', () => {
    expect(new FiltroProduto().validar()).toEqual({});
  });

  it('aceita os 3 filtros preenchidos', () => {
    expect(new FiltroProduto({ nome: 'arroz', categoria: 'Alimento', validade: 'VENCIDOS' }).validar()).toEqual({});
  });

  it('rejeita categoria e situação de validade desconhecidas', () => {
    const erros = new FiltroProduto({ categoria: 'Xyz', validade: 'ONTEM' }).validar();
    expect(erros).toHaveProperty('categoria');
    expect(erros).toHaveProperty('validade');
  });

  it('ignora espaços e trata nulos como vazio', () => {
    const filtro = new FiltroProduto({ nome: '  arroz ', categoria: null, validade: null });
    expect(filtro.getNome()).toBe('arroz');
    expect(filtro.getCategoria()).toBe('');
    expect(filtro.getValidade()).toBe('');
  });
});

describe('Model Produto - RF_F1 Atualizar estoque (getQuantidade / atualizQuantidade)', () => {
  const comEstoque = (quantidadeEstoque: number, dataValidade: string | null = null) =>
    new Produto({ ...valido, quantidadeEstoque, dataValidade });

  it('entrada soma e saída subtrai (passo 3)', () => {
    const p = comEstoque(10);
    expect(p.atualizQuantidade(5, 'ENTRADA')).toBe(true);
    expect(p.getQuantidade()).toBe(15);
    expect(p.atualizQuantidade(3, 'SAIDA')).toBe(true);
    expect(p.getQuantidade()).toBe(12);
  });

  it('saída maior que o estoque é recusada e nada muda (fluxo alternativo 3.1)', () => {
    const p = comEstoque(4, '2030-12-10');
    expect(p.atualizQuantidade(5, 'SAIDA')).toBe(false);
    expect(p.getQuantidade()).toBe(4);
    expect(p.getDataValidade()).toBe('2030-12-10');
  });

  it('validade: a entrada deixa a mais próxima; saída que zera limpa', () => {
    const p = comEstoque(0);
    p.atualizQuantidade(5, 'ENTRADA', '2030-12-20');
    expect(p.getDataValidade()).toBe('2030-12-20');
    p.atualizQuantidade(5, 'ENTRADA', '2030-12-10');
    expect(p.getDataValidade()).toBe('2030-12-10');
    p.atualizQuantidade(5, 'ENTRADA', '2031-01-01');
    expect(p.getDataValidade()).toBe('2030-12-10');
    p.atualizQuantidade(1, 'ENTRADA');
    expect(p.getDataValidade()).toBe('2030-12-10');
    p.atualizQuantidade(16, 'SAIDA');
    expect(p.getQuantidade()).toBe(0);
    expect(p.getDataValidade()).toBeNull();
  });

  it('com estoque zerado, a próxima entrada define a validade de novo', () => {
    const p = comEstoque(0, '2020-01-01');
    p.atualizQuantidade(2, 'ENTRADA', '2031-05-05');
    expect(p.getDataValidade()).toBe('2031-05-05');
  });
});
