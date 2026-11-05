/**
 * API de um produto específico (RF_B3)
 * GET    /api/produtos/:id -> busca o produto
 * PUT    /api/produtos/:id -> edita o produto
 * DELETE /api/produtos/:id -> exclui o produto
 */

import { ProdutoController } from '@/server/ProdutoController';
import { respostaDeErro } from '@/server/http';

// Nesta versão do Next.js, "params" é uma Promise e precisa de await
type Contexto = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Contexto) {
  try {
    const { id } = await params;
    const produto = await ProdutoController.getInstancia().buscarPorId(Number(id));
    return Response.json(produto.paraLinhaDeDados());
  } catch (erro) {
    return respostaDeErro(erro);
  }
}

export async function PUT(request: Request, { params }: Contexto) {
  try {
    const { id } = await params;
    const dados = await request.json();
    const produto = await ProdutoController.getInstancia().editar(Number(id), dados);
    return Response.json(produto.paraLinhaDeDados());
  } catch (erro) {
    return respostaDeErro(erro);
  }
}

export async function DELETE(_request: Request, { params }: Contexto) {
  try {
    const { id } = await params;
    await ProdutoController.getInstancia().excluir(Number(id));
    return Response.json({ mensagem: 'Produto excluído.' });
  } catch (erro) {
    return respostaDeErro(erro);
  }
}
