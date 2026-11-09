/**
 * API de produtos (RF_B3 - Gerenciar produtos)
 * GET  /api/produtos?nome=&categoria=&validade= -> consulta os produtos (filtros opcionais)
 * POST /api/produtos                            -> cadastra um produto
 */

import { ProdutoController } from '@/server/ProdutoController';
import { respostaDeErro } from '@/server/http';

export async function GET(request: Request) {
  try {
    const parametros = new URL(request.url).searchParams;
    const produtos = await ProdutoController.getInstancia().consultar({
      nome: parametros.get('nome'),
      categoria: parametros.get('categoria'),
      validade: parametros.get('validade'),
    });
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
