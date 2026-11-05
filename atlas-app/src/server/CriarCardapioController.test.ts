import { describe, expect, it, beforeEach } from 'vitest';
import { CriarCardapioController } from './CriarCardapioController';
import { CardapioDiario, type TipoRefeicao } from './model/CardapioDiario';
import { ItemCardapio } from './model/ItemCardapio';
import { ErroRegraDeNegocio, ErroValidacao } from './erros';
import { criarAmbienteFalsoDeTransacao } from './test-utils/ambienteFalsoDeTransacao';

// usa horário local pra não pular de dia por causa do fuso
function amanha(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function montarAmbiente() {
  const ambiente = criarAmbienteFalsoDeTransacao([
    { id: 1, nome: 'Arroz 5kg', unidade_medida: 'pacote', quantidade_estoque: 10, estoque_minimo: 2 },
    { id: 2, nome: 'Feijão 1kg', unidade_medida: 'pacote', quantidade_estoque: 3, estoque_minimo: 1 },
  ]);

  const cardapios = ambiente.registrarListaEstagiada(ambiente.criarListaEstagiada<CardapioDiario>());
  const itens = ambiente.registrarListaEstagiada(ambiente.criarListaEstagiada<ItemCardapio>());

  const consultaDuplicidade = {
    async existeParaDataETipo(data: string, tipoRefeicao: TipoRefeicao) {
      return cardapios
        .obterConfirmados()
        .some((c) => c.getData() === data && c.getTipoRefeicao() === tipoRefeicao);
    },
  };

  const controller = new CriarCardapioController(
    ambiente.database,
    () => cardapios,
    () => itens,
    () => ambiente.produtoDAOFalso(),
    consultaDuplicidade
  );

  return { ambiente, cardapios, itens, controller };
}

describe('CriarCardapioController - RF_F10 Criar Cardápio Diário', () => {
  let ctx: ReturnType<typeof montarAmbiente>;

  beforeEach(() => {
    ctx = montarAmbiente();
  });

  it('cria um cardápio e debita o estoque dos alimentos usados (RF_F1 acionado internamente)', async () => {
    const resultado = await ctx.controller.criarCardapioDiario({ data: amanha(), tipoRefeicao: 'ALMOCO' }, [
      { produtoId: 1, quantidadeUtilizada: 3 },
      { produtoId: 2, quantidadeUtilizada: 1 },
    ]);

    expect(resultado.itens).toHaveLength(2);
    expect(ctx.ambiente.obterProdutoConfirmado(1)?.quantidade_estoque).toBe(7);
    expect(ctx.ambiente.obterProdutoConfirmado(2)?.quantidade_estoque).toBe(2);
  });

  it('rejeita cardápio sem nenhum alimento informado (ERS 6.1)', async () => {
    await expect(ctx.controller.criarCardapioDiario({ data: amanha(), tipoRefeicao: 'ALMOCO' }, [])).rejects.toThrow(
      ErroValidacao
    );
  });

  it('rejeita data inválida antes de tocar no banco (ERS 1.1)', async () => {
    await expect(
      ctx.controller.criarCardapioDiario({ data: 'data-invalida', tipoRefeicao: 'ALMOCO' }, [
        { produtoId: 1, quantidadeUtilizada: 1 },
      ])
    ).rejects.toThrow(ErroValidacao);

    expect(ctx.cardapios.obterConfirmados()).toHaveLength(0);
  });

  it('rejeita cardápio duplicado para a mesma data e tipo de refeição', async () => {
    await ctx.controller.criarCardapioDiario({ data: amanha(), tipoRefeicao: 'ALMOCO' }, [
      { produtoId: 1, quantidadeUtilizada: 1 },
    ]);

    await expect(
      ctx.controller.criarCardapioDiario({ data: amanha(), tipoRefeicao: 'ALMOCO' }, [
        { produtoId: 1, quantidadeUtilizada: 1 },
      ])
    ).rejects.toThrow(ErroValidacao);
  });

  it('rejeita e desfaz tudo quando um alimento está indisponível em estoque (ERS 3.1)', async () => {
    await expect(
      ctx.controller.criarCardapioDiario({ data: amanha(), tipoRefeicao: 'JANTAR' }, [
        { produtoId: 1, quantidadeUtilizada: 2 }, // teria sucesso...
        { produtoId: 2, quantidadeUtilizada: 50 }, // ...mas este falha (só há 3 em estoque)
      ])
    ).rejects.toThrow(ErroRegraDeNegocio);

    // ROLLBACK: nada do cardápio é persistido e o estoque do primeiro item
    // volta ao valor original.
    expect(ctx.cardapios.obterConfirmados()).toHaveLength(0);
    expect(ctx.itens.obterConfirmados()).toHaveLength(0);
    expect(ctx.ambiente.obterProdutoConfirmado(1)?.quantidade_estoque).toBe(10);
    expect(ctx.ambiente.obterProdutoConfirmado(2)?.quantidade_estoque).toBe(3);
  });
});
