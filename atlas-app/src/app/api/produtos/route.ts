/**
 * API de produtos (RF_B3)
 * GET  /api/produtos -> lista os produtos
 * POST /api/produtos -> cadastra um produto
 */

import { ProdutoService } from '@/server/ProdutoService';

export async function GET() {
  const service = ProdutoService.getInstancia();
  return Response.json(service.listar());
}

export async function POST(request: Request) {
  const service = ProdutoService.getInstancia();
  const dados = await request.json();
  try {
    const produto = service.cadastrar(dados);
    return Response.json(produto, { status: 201 });
  } catch (erro) {
    return Response.json({ erro: (erro as Error).message }, { status: 400 });
  }
}
