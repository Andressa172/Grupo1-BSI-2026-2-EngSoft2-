/**
 * API de produtos (RF_B3 - Gerenciar produtos)
 * GET  /api/produtos -> lista os produtos
 * POST /api/produtos -> cadastra um produto
 */

import { ProdutoController } from '@/server/ProdutoController';
import { respostaDeErro } from '@/server/http';

export async function GET() {
  try {
    const produtos = await ProdutoController.getInstancia().listar();
    return Response.json(produtos.map((p) => p.paraLinhaDeDados()));
  } catch (erro) {
    return respostaDeErro(erro);
  }
}

export async function POST(request: Request) {
  try {
    const dados = await request.json();
    const produto = await ProdutoController.getInstancia().cadastrar(dados);
    return Response.json(produto.paraLinhaDeDados(), { status: 201 });
  } catch (erro) {
    return respostaDeErro(erro);
  }
}
