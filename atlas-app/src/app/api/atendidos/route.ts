/**
 * API de atendidos (RF_B1 - Gerenciar atendidos)
 * GET  /api/atendidos?nome=&sexo=&idadeMinima=&idadeMaxima= -> consulta (filtros opcionais)
 * POST /api/atendidos                                      -> cadastra um atendido
 */

import { GerenciarAtendidosController } from '@/server/GerenciarAtendidosController';
import { respostaDeErro } from '@/server/http';
import { lerJson } from '@/server/lerJson';

export async function GET(request: Request) {
  try {
    const parametros = new URL(request.url).searchParams;
    const atendidos = await GerenciarAtendidosController.getInstancia().consultar({
      nome: parametros.get('nome'),
      sexo: parametros.get('sexo'),
      idadeMinima: parametros.get('idadeMinima'),
      idadeMaxima: parametros.get('idadeMaxima'),
    });
    return Response.json(atendidos.map((a) => a.paraLinhaDeDados()));
  } catch (erro) {
    return respostaDeErro(erro);
  }
}

export async function POST(request: Request) {
  try {
    const dados = await lerJson(request);
    const atendido = await GerenciarAtendidosController.getInstancia().cadastrar(dados);
    return Response.json(atendido.paraLinhaDeDados(), { status: 201 });
  } catch (erro) {
    return respostaDeErro(erro);
  }
}
