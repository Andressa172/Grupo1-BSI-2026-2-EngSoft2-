/**
 * API de doadores (RF_B4 - Gerenciar Doadores)
 * GET  /api/doadores?nome=&tipoPessoa=&anonimo= -> consulta (filtros opcionais)
 * POST /api/doadores                            -> cadastra um doador
 */

import { DoadorController, type DadosDoador } from '@/server/DoadorController';
import { respostaDeErro } from '@/server/http';
import { lerJson } from '@/server/lerJson';

export async function GET(request: Request) {
  try {
    const parametros = new URL(request.url).searchParams;
    const doadores = await DoadorController.getInstancia().consultar({
      nome: parametros.get('nome'),
      tipoPessoa: parametros.get('tipoPessoa'),
      anonimo: parametros.get('anonimo'),
    });
    return Response.json(doadores.map((d) => d.paraLinhaDeDados()));
  } catch (erro) {
    return respostaDeErro(erro);
  }
}

export async function POST(request: Request) {
  try {
    const dados = (await lerJson(request)) as DadosDoador;
    const doador = await DoadorController.getInstancia().cadastrar(dados);
    return Response.json(doador.paraLinhaDeDados(), { status: 201 });
  } catch (erro) {
    return respostaDeErro(erro);
  }
}
