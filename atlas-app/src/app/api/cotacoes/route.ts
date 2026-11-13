/**
 * API de Cotações (RF_F7 - Abrir cotação)
 * GET  /api/cotacoes?id=&status=&descricao=&dataAbertura=&dataAprovacao=&produtoId=&item=&dataInicial=&dataFinal= -> consulta cotações
 * POST /api/cotacoes                                                                                             -> abre uma nova cotação (Secretário)
 */

import { AbrirCotacaoController } from '@/server/AbrirCotacaoController';
import { respostaDeErro } from '@/server/http';
import { lerJson } from '@/server/lerJson';

export async function GET(request: Request) {
  try {
    const parametros = new URL(request.url).searchParams;
    const cotacoes = await AbrirCotacaoController.getInstancia().consultar({
      id: parametros.get('id'),
      status: parametros.get('status'),
      descricao: parametros.get('descricao'),
      dataAbertura: parametros.get('dataAbertura'),
      dataAberturaInicio: parametros.get('dataAberturaInicio'),
      dataAberturaFim: parametros.get('dataAberturaFim'),
      dataAprovacao: parametros.get('dataAprovacao'),
      dataAprovacaoInicio: parametros.get('dataAprovacaoInicio'),
      dataAprovacaoFim: parametros.get('dataAprovacaoFim'),
      produtoId: parametros.get('produtoId'),
      item: parametros.get('item'),
      dataInicial: parametros.get('dataInicial'),
      dataFinal: parametros.get('dataFinal'),
    });
    return Response.json(cotacoes);
  } catch (erro) {
    return respostaDeErro(erro);
  }
}

export async function POST(request: Request) {
  try {
    const dados = await lerJson(request);
    const cotacao = await AbrirCotacaoController.getInstancia().abrir(dados);
    return Response.json(cotacao, { status: 201 });
  } catch (erro) {
    return respostaDeErro(erro);
  }
}
