/**
 * API de um cardápio específico (RF_F10)
 * PUT    /api/cardapios/:id -> altera o cardápio e refaz os itens (estorna e dá saída no estoque)
 * DELETE /api/cardapios/:id -> exclui o cardápio (estorna o estoque dos alimentos usados)
 */

import { CriarCardapioController } from '@/server/CriarCardapioController';
import { respostaDeErro } from '@/server/http';
import { lerJson } from '@/server/lerJson';

type Contexto = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Contexto) {
  try {
    const { id } = await params;
    const dados = await lerJson(request);
    const cardapio = await CriarCardapioController.getInstancia().alterar(Number(id), dados);
    return Response.json({ id: cardapio.getId() });
  } catch (erro) {
    return respostaDeErro(erro);
  }
}

export async function DELETE(_request: Request, { params }: Contexto) {
  try {
    const { id } = await params;
    await CriarCardapioController.getInstancia().excluir(Number(id));
    return Response.json({ mensagem: 'Cardápio excluído.' });
  } catch (erro) {
    return respostaDeErro(erro);
  }
}
