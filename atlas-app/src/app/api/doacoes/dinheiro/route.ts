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
<<<<<<< HEAD
    const doacoes = await new DoacaoService().consultarDinheiro({
=======
    const doacoes = await new ReceberDoacaoDinheiroController().consultar({
>>>>>>> ff417c4de0e7941ad1f7b899e4d416e5da8847eb
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
<<<<<<< HEAD
    const doacao = await new DoacaoService().registrarDinheiro(dados);
=======
    const doacao = await new ReceberDoacaoDinheiroController().registrar(dados);
>>>>>>> ff417c4de0e7941ad1f7b899e4d416e5da8847eb
    return Response.json(doacao.paraLinhaDeDados(), { status: 201 });
  } catch (erro) {
    return respostaDeErro(erro);
  }
}
