/**
 * API de um evento específico (RF_F9)
 * PUT    /api/eventos/:id -> altera o evento e refaz a alocação de recursos (estorna e realoca o estoque)
 * DELETE /api/eventos/:id -> exclui o evento (estorna o estoque alocado)
 */

import { AlocarRecursosController } from '@/server/AlocarRecursosController';
import { respostaDeErro } from '@/server/http';
import { lerJson } from '@/server/lerJson';

type Contexto = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Contexto) {
  try {
    const { id } = await params;
    const dados = await lerJson(request);
    const evento = await AlocarRecursosController.getInstancia().alterar(Number(id), dados);
    return Response.json({ id: evento.getId() });
  } catch (erro) {
    return respostaDeErro(erro);
  }
}

export async function DELETE(_request: Request, { params }: Contexto) {
  try {
    const { id } = await params;
    await AlocarRecursosController.getInstancia().excluir(Number(id));
    return Response.json({ mensagem: 'Evento excluído.' });
  } catch (erro) {
    return respostaDeErro(erro);
  }
}
