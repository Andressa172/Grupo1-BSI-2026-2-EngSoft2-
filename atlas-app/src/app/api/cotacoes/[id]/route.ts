/**
 * API de Cotação específica (RF_F7 alterar / RF_F8 aprovar ou reprovar)
 * GET   /api/cotacoes/:id -> recupera dados e itens da cotação pelo identificador
 * PUT   /api/cotacoes/:id -> altera os dados e itens da cotação (Secretário)
 * PATCH /api/cotacoes/:id -> aprova ou reprova a cotação (Gerente)
 */

import { AbrirCotacaoController } from '@/server/AbrirCotacaoController';
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
  try {
    const { id } = await params;
    const dados = await lerJson(request);
    const cotacao = await AbrirCotacaoController.getInstancia().alterar(id, dados);
    return Response.json(cotacao);
  } catch (erro) {
    return respostaDeErro(erro);
  }
}
