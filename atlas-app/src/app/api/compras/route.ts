/**
 * API de compras (RF_F2 - Lançar entrada de compras)
 * GET  /api/compras?numeroNF=&fornecedor=&dataInicial=&dataFinal= -> consulta (filtros opcionais)
 * POST /api/compras                                               -> lança uma compra e dá entrada no estoque
 * Só o Gerente autenticado (cabeçalho x-usuario-id) pode consultar e lançar compras (RF_F2).
 */

import { exigirGerente } from '@/server/auth';
import { LancarEntradaCompraController } from '@/server/LancarEntradaCompraController';
import { respostaDeErro } from '@/server/http';
import { lerJson } from '@/server/lerJson';

export async function GET(request: Request) {
  try {
    await exigirGerente(request, undefined, 'consultar compras');
    const parametros = new URL(request.url).searchParams;
    const compras = await new LancarEntradaCompraController().consultar({
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
    const gerente = await exigirGerente(request, undefined, 'lançar compras');
    const dados = await lerJson(request);
    const compra = await new LancarEntradaCompraController().registrar(dados, gerente.getId()!);
    return Response.json(compra.paraLinhaDeDados(), { status: 201 });
  } catch (erro) {
    return respostaDeErro(erro);
  }
}
