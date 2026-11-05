/**
 * API de cardápios diários (RF_F10 - Criar Cardápio Diário)
 * GET  /api/cardapios -> lista cardápios com os itens
 * POST /api/cardapios -> cria um cardápio diário com os alimentos informados
 *
 * Body esperado no POST:
 * { "cardapio": { "data", "tipoRefeicao" }, "itens": [{ "produtoId", "quantidadeUtilizada" }] }
 */

import { CriarCardapioController } from '@/server/CriarCardapioController';
import { respostaDeErro } from '@/server/http';
import { ProdutoDAO } from '@/server/dao/ProdutoDAO';

export async function GET() {
  const [resultados, produtos] = await Promise.all([
    CriarCardapioController.getInstancia().listarCardapiosComItens(),
    new ProdutoDAO().listarTodos(),
  ]);
  return Response.json({ cardapios: resultados, produtos });
}

export async function POST(request: Request) {
  try {
    const corpo = await request.json();
    const resultado = await CriarCardapioController.getInstancia().criarCardapioDiario(corpo.cardapio, corpo.itens);
    return Response.json(resultado, { status: 201 });
  } catch (erro) {
    return respostaDeErro(erro);
  }
}
