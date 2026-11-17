/**
 * API de um doador específico (RF_B4)
 * GET    /api/doadores/:id -> busca o doador
 * PUT    /api/doadores/:id -> edita o doador
 * DELETE /api/doadores/:id -> exclui o doador
 */

import { DoacaoService, type DadosDoador } from '@/server/service/DoacaoService';
import { respostaDeErro } from '@/server/http';
import { lerJson } from '@/server/lerJson';

type Contexto = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Contexto) {
  try {
    const { id } = await params;
    const doador = await new DoacaoService().buscarDoadorPorId(Number(id));
    return Response.json(doador.paraLinhaDeDados());
  } catch (erro) {
    return respostaDeErro(erro);
  }
}

export async function PUT(request: Request, { params }: Contexto) {
  try {
    const { id } = await params;
    const dados = (await lerJson(request)) as DadosDoador;
    const doador = await new DoacaoService().editarDoador(Number(id), dados);
    return Response.json(doador.paraLinhaDeDados());
  } catch (erro) {
    return respostaDeErro(erro);
  }
}

export async function DELETE(_request: Request, { params }: Contexto) {
  try {
    const { id } = await params;
    await new DoacaoService().excluirDoador(Number(id));
    return Response.json({ mensagem: 'Doador excluído.' });
  } catch (erro) {
    return respostaDeErro(erro);
  }
}
