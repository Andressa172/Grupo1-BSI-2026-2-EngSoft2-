import { describe, expect, it, beforeEach } from 'vitest';
import { AlocarRecursosController } from './AlocarRecursosController';
import { Evento } from './model/Evento';
import { AlocacaoRecurso } from './model/AlocacaoRecurso';
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

  const eventos = ambiente.registrarListaEstagiada(ambiente.criarListaEstagiada<Evento>());
  const alocacoes = ambiente.registrarListaEstagiada(ambiente.criarListaEstagiada<AlocacaoRecurso>());

  const controller = new AlocarRecursosController(
    ambiente.database,
    () => eventos,
    () => alocacoes,
    () => ambiente.produtoDAOFalso()
  );

  return { ambiente, eventos, alocacoes, controller };
}

describe('AlocarRecursosController - RF_F9 Alocar Recursos para Eventos', () => {
  let ctx: ReturnType<typeof montarAmbiente>;

  beforeEach(() => {
    ctx = montarAmbiente();
  });

  it('aloca um recurso de produto e debita o estoque (RF_F1 acionado internamente)', async () => {
    const resultado = await ctx.controller.alocarRecursosParaEvento(
      { nome: 'Festa Junina', data: amanha() },
      [{ tipo: 'PRODUTO', produtoId: 1, quantidade: 4 }]
    );

    expect(resultado.evento.nome).toBe('Festa Junina');
    expect(resultado.recursos).toHaveLength(1);
    expect(ctx.ambiente.obterProdutoConfirmado(1)?.quantidade_estoque).toBe(6);
    expect(ctx.ambiente.obterMovimentacoes()).toHaveLength(1);
  });

  it('aloca um recurso financeiro sem mexer no estoque', async () => {
    const resultado = await ctx.controller.alocarRecursosParaEvento(
      { nome: 'Festa Junina', data: amanha() },
      [{ tipo: 'FINANCEIRO', valor: 200 }]
    );

    expect(resultado.recursos[0].valor).toBe(200);
    expect(ctx.ambiente.obterProdutoConfirmado(1)?.quantidade_estoque).toBe(10);
  });

  it('aloca múltiplos recursos (produto + financeiro) no mesmo evento', async () => {
    const resultado = await ctx.controller.alocarRecursosParaEvento({ nome: 'Festa Junina', data: amanha() }, [
      { tipo: 'PRODUTO', produtoId: 1, quantidade: 2 },
      { tipo: 'FINANCEIRO', valor: 50 },
    ]);

    expect(resultado.recursos).toHaveLength(2);
    expect(ctx.ambiente.obterProdutoConfirmado(1)?.quantidade_estoque).toBe(8);
  });

  it('rejeita quando nenhum recurso é informado (ERS 3.2)', async () => {
    await expect(ctx.controller.alocarRecursosParaEvento({ nome: 'Festa Junina', data: amanha() }, [])).rejects.toThrow(
      ErroValidacao
    );
  });

  it('rejeita evento com nome em branco antes de tocar no banco (ERS 1.1)', async () => {
    await expect(
      ctx.controller.alocarRecursosParaEvento({ nome: '', data: amanha() }, [{ tipo: 'PRODUTO', produtoId: 1, quantidade: 1 }])
    ).rejects.toThrow(ErroValidacao);

    expect(ctx.eventos.obterConfirmados()).toHaveLength(0);
  });

  it('rejeita e desfaz tudo quando um recurso de produto está indisponível (ERS 3.1)', async () => {
    // Pede mais feijão (produto 2) do que existe em estoque (3 disponíveis).
    await expect(
      ctx.controller.alocarRecursosParaEvento({ nome: 'Festa Junina', data: amanha() }, [
        { tipo: 'PRODUTO', produtoId: 1, quantidade: 2 }, // esse teria sucesso...
        { tipo: 'PRODUTO', produtoId: 2, quantidade: 10 }, // ...mas esse falha
      ])
    ).rejects.toThrow(ErroRegraDeNegocio);

    // ROLLBACK: nem o evento, nem o primeiro recurso (produto 1) ficam
    // persistidos, e o estoque do produto 1 volta ao valor original.
    expect(ctx.eventos.obterConfirmados()).toHaveLength(0);
    expect(ctx.alocacoes.obterConfirmados()).toHaveLength(0);
    expect(ctx.ambiente.obterProdutoConfirmado(1)?.quantidade_estoque).toBe(10);
    expect(ctx.ambiente.obterProdutoConfirmado(2)?.quantidade_estoque).toBe(3);
  });
});
