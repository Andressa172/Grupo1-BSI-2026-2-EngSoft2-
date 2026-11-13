/**
 * API de estoque (RF_F1 - Atualizar estoque)
 * GET /api/estoque/movimentacoes?produtoId=&tipo=&dataInicial=&dataFinal= -> histórico (filtros opcionais)
 *
 * Não há POST: RF_F1 é oculto (ERS 2.2), o estoque só muda pelos casos de uso solicitantes
 * (doação de produto, compras, cardápio, eventos).
 */

import { AtualizarEstoqueController } from '@/server/AtualizarEstoqueController';
import { respostaDeErro } from '@/server/http';

export async function GET(request: Request) {
  try {
    const parametros = new URL(request.url).searchParams;
    const movimentacoes = await AtualizarEstoqueController.getInstancia().consultar({
      produtoId: parametros.get('produtoId'),
      tipo: parametros.get('tipo'),
      dataInicial: parametros.get('dataInicial'),
      dataFinal: parametros.get('dataFinal'),
    });
    return Response.json(movimentacoes);
  } catch (erro) {
    return respostaDeErro(erro);
  }
}
