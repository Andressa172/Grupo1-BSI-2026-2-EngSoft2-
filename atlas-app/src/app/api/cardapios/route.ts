/**
 * API de cardápios diários (RF_F10 - Criar Cardápio Diário)
 * GET  /api/cardapios?dataInicial=&dataFinal=&tipoRefeicao= -> consulta (filtros opcionais)
 * POST /api/cardapios                                       -> cria um cardápio diário com os alimentos informados
 *
 * Body esperado no POST:
 * { "data", "tipoRefeicao", "itens": [{ "produtoId", "quantidadeUtilizada" }] }
 */

import { CriarCardapioController } from '@/server/CriarCardapioController';
import { respostaDeErro } from '@/server/http';
import { lerJson } from '@/server/lerJson';

export async function GET(request: Request) {
  try {
    const parametros = new URL(request.url).searchParams;
    const [cardapios, produtos] = await Promise.all([
      CriarCardapioController.getInstancia().consultar({
        dataInicial: parametros.get('dataInicial'),
        dataFinal: parametros.get('dataFinal'),
        tipoRefeicao: parametros.get('tipoRefeicao'),
      }),
      CriarCardapioController.getInstancia().listarProdutos(),
    ]);
    return Response.json({ cardapios, produtos });
  } catch (erro) {
    return respostaDeErro(erro);
  }
}

export async function POST(request: Request) {
  try {
    const dados = await lerJson(request);
    const cardapio = await CriarCardapioController.getInstancia().criarCardapioDiario(dados);
    return Response.json({ id: cardapio.getId() }, { status: 201 });
  } catch (erro) {
    return respostaDeErro(erro);
  }
}
