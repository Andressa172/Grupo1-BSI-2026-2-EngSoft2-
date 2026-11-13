/**
 * API de compras (RF_F2 - Lançar entrada de compras)
 * GET  /api/compras?numeroNF=&fornecedor=&dataInicial=&dataFinal= -> consulta (filtros opcionais)
 * POST /api/compras                                               -> lança uma compra e dá entrada no estoque
 */

import { LancarEntradaCompraController } from '@/server/LancarEntradaCompraController';
import { respostaDeErro } from '@/server/http';
import { lerJson } from '@/server/lerJson';

export async function GET(request: Request) {
  try {
    const parametros = new URL(request.url).searchParams;
    const compras = await LancarEntradaCompraController.getInstancia().consultar({
      numeroNF: parametros.get('numeroNF'),
      fornecedor: parametros.get('fornecedor'),
      dataInicial: parametros.get('dataInicial'),
      dataFinal: parametros.get('dataFinal'),
    });
    return Response.json(compras);
  } catch (erro) {
    return respostaDeErro(erro);
  }
}

export async function POST(request: Request) {
  try {
    const dados = await lerJson(request);
    const compra = await LancarEntradaCompraController.getInstancia().registrar(dados);
    return Response.json(compra.paraLinhaDeDados(), { status: 201 });
  } catch (erro) {
    return respostaDeErro(erro);
  }
}
