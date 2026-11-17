/**
 * API de um atendido específico (RF_B1)
 * GET    /api/atendidos/:id -> busca o atendido
 * PUT    /api/atendidos/:id -> altera o atendido
 * DELETE /api/atendidos/:id -> exclui o atendido
 */

import { GerenciarAtendidosController } from '@/server/GerenciarAtendidosController';
import { respostaDeErro } from '@/server/http';
import { lerJson } from '@/server/lerJson';

type Contexto = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Contexto) {
  try {
    const { id } = await params;
    const atendido = await new GerenciarAtendidosController().buscarPorId(Number(id));
    return Response.json(atendido.paraLinhaDeDados());
  } catch (erro) {
    return respostaDeErro(erro);
  }
}

export async function PUT(request: Request, { params }: Contexto) {
  try {
    const { id } = await params;
    const dados = await lerJson(request);
    const atendido = await new GerenciarAtendidosController().editar(Number(id), dados);
    return Response.json(atendido.paraLinhaDeDados());
  } catch (erro) {
    return respostaDeErro(erro);
  }
}

export async function DELETE(_request: Request, { params }: Contexto) {
  try {
    const { id } = await params;
    await new GerenciarAtendidosController().excluir(Number(id));
    return Response.json({ mensagem: 'Atendido excluído.' });
  } catch (erro) {
    return respostaDeErro(erro);
  }
}
