/**
 * API de doações de dinheiro (RF_F11 - Receber doação em dinheiro)
 * GET  /api/doacoes/dinheiro?doadorId=&dataInicial=&dataFinal= -> consulta (filtros opcionais)
 * POST /api/doacoes/dinheiro                                   -> registra uma doação
 */

import { DoacaoService } from '@/server/service/DoacaoService';
import { respostaDeErro } from '@/server/http';
import { lerJson } from '@/server/lerJson';

export async function GET(request: Request) {
  try {
    const parametros = new URL(request.url).searchParams;
    const doacoes = await new DoacaoService().consultarDinheiro({
      doadorId: parametros.get('doadorId'),
      dataInicial: parametros.get('dataInicial'),
      dataFinal: parametros.get('dataFinal'),
    });
    return Response.json(doacoes);
  } catch (erro) {
    return respostaDeErro(erro);
  }
}

export async function POST(request: Request) {
  try {
    const dados = await lerJson(request);
    const doacao = await new DoacaoService().registrarDinheiro(dados);
    return Response.json(doacao.paraLinhaDeDados(), { status: 201 });
  } catch (erro) {
    return respostaDeErro(erro);
  }
}
