/**
 * API de doações de dinheiro (RF_F11 - Receber doação em dinheiro)
 * GET  /api/doacoes/dinheiro?doadorId=&dataInicial=&dataFinal= -> consulta (filtros opcionais)
 * POST /api/doacoes/dinheiro                                   -> registra uma doação
 */

import { ReceberDoacaoDinheiroController } from '@/server/ReceberDoacaoDinheiroController';
import { respostaDeErro } from '@/server/http';
import { lerJson } from '@/server/lerJson';

export async function GET(request: Request) {
  try {
    const parametros = new URL(request.url).searchParams;
    const doacoes = await ReceberDoacaoDinheiroController.getInstancia().consultar({
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
    const doacao = await ReceberDoacaoDinheiroController.getInstancia().registrar(dados);
    return Response.json(doacao.paraLinhaDeDados(), { status: 201 });
  } catch (erro) {
    return respostaDeErro(erro);
  }
}
