/**
 * API de um doador específico (RF_B4)
 * GET    /api/doadores/:id -> busca o doador
 * PUT    /api/doadores/:id -> edita o doador
 * DELETE /api/doadores/:id -> exclui o doador
 */

import { DoadorController, type DadosDoador } from '@/server/DoadorController';
import { respostaDeErro } from '@/server/http';
import { lerJson } from '@/server/lerJson';

type Contexto = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Contexto) {
  try {
    const { id } = await params;
    const doador = await DoadorController.getInstancia().buscarPorId(Number(id));
    return Response.json(doador.paraLinhaDeDados());
  } catch (erro) {
    return respostaDeErro(erro);
  }
}

export async function PUT(request: Request, { params }: Contexto) {
  try {
    const { id } = await params;
    const dados = (await lerJson(request)) as DadosDoador;
    const doador = await DoadorController.getInstancia().editar(Number(id), dados);
    return Response.json(doador.paraLinhaDeDados());
  } catch (erro) {
    return respostaDeErro(erro);
  }
}

export async function DELETE(_request: Request, { params }: Contexto) {
  try {
    const { id } = await params;
    await DoadorController.getInstancia().excluir(Number(id));
    return Response.json({ mensagem: 'Doador excluído.' });
  } catch (erro) {
    return respostaDeErro(erro);
  }
}
