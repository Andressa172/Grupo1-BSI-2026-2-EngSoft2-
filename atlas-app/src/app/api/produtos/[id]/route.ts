/**
 * API de um produto específico (RF_B3)
 * GET    /api/produtos/:id -> busca o produto
 * PUT    /api/produtos/:id -> edita o produto
 * DELETE /api/produtos/:id -> exclui o produto
 */

import { ProdutoService } from '@/server/ProdutoService';

// Nesta versão do Next.js, "params" é uma Promise e precisa de await
type Contexto = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Contexto) {
  const { id } = await params;
  const produto = ProdutoService.getInstancia().buscarPorId(id);
  if (!produto) {
    return Response.json({ erro: 'Produto não encontrado.' }, { status: 404 });
  }
  return Response.json(produto);
}

export async function PUT(request: Request, { params }: Contexto) {
  const { id } = await params;
  const dados = await request.json();
  try {
    const produto = ProdutoService.getInstancia().editar(id, dados);
    return Response.json(produto);
  } catch (erro) {
    return Response.json({ erro: (erro as Error).message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: Contexto) {
  const { id } = await params;
  try {
    ProdutoService.getInstancia().excluir(id);
    return Response.json({ mensagem: 'Produto excluído.' });
  } catch (erro) {
    return Response.json({ erro: (erro as Error).message }, { status: 404 });
  }
}
