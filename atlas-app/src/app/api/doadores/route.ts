/**
 * API de doadores (RF_B4 - Gerenciar Doadores)
 * GET  /api/doadores -> lista os doadores
 * POST /api/doadores -> cadastra um doador
 */

import { DoadorController } from '@/server/DoadorController';
import { respostaDeErro } from '@/server/http';

export async function GET() {
  const doadores = await DoadorController.getInstancia().listar();
  return Response.json(doadores.map((d) => d.paraLinhaDeDados()));
}

export async function POST(request: Request) {
  try {
    const dados = await request.json();
    const doador = await DoadorController.getInstancia().cadastrar(dados);
    return Response.json(doador.paraLinhaDeDados(), { status: 201 });
  } catch (erro) {
    return respostaDeErro(erro);
  }
}
