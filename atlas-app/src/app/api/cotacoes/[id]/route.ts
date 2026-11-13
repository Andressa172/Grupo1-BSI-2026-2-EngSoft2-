/**
 * API de Avaliação de Cotação (RF_F8 - Aprovar cotação)
 * GET   /api/cotacoes/:id -> recupera dados e itens da cotação pelo identificador
 * PATCH /api/cotacoes/:id -> aprova ou reprova a cotação (Gerente)
 * PUT   /api/cotacoes/:id -> alias para aprovar ou reprovar a cotação (Gerente)
 */

import { AprovarCotacaoController } from '@/server/AprovarCotacaoController';
import { respostaDeErro } from '@/server/http';
import { lerJson } from '@/server/lerJson';

type Contexto = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Contexto) {
  try {
    const { id } = await params;
    const cotacao = await AprovarCotacaoController.getInstancia().buscarPorId(id);
    return Response.json(cotacao);
  } catch (erro) {
    return respostaDeErro(erro);
  }
}

export async function PATCH(request: Request, { params }: Contexto) {
  try {
    const { id } = await params;
    const dados = await lerJson(request);
    const cotacao = await AprovarCotacaoController.getInstancia().avaliar(id, dados);
    return Response.json(cotacao);
  } catch (erro) {
    return respostaDeErro(erro);
  }
}

export async function PUT(request: Request, { params }: Contexto) {
  return PATCH(request, { params });
}
