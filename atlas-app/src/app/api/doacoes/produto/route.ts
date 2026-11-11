/**
 * API de doações de produto (RF_F3 - Receber doação de produto)
 * GET  /api/doacoes/produto?doadorId=&dataInicial=&dataFinal= -> consulta (filtros opcionais)
 * POST /api/doacoes/produto                                   -> registra uma doação
 */

import { ReceberDoacaoProdutoController } from '@/server/ReceberDoacaoProdutoController';
import { respostaDeErro } from '@/server/http';
import { lerJson } from '@/server/lerJson';

export async function GET(request: Request) {
  try {
    const parametros = new URL(request.url).searchParams;
    const doacoes = await ReceberDoacaoProdutoController.getInstancia().consultar({
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
    const doacao = await ReceberDoacaoProdutoController.getInstancia().registrar(dados);
    return Response.json(doacao.paraLinhaDeDados(), { status: 201 });
  } catch (erro) {
    return respostaDeErro(erro);
  }
}
