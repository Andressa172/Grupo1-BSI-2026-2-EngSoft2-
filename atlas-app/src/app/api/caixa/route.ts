/**
 * API de consulta do caixa (RF_F4 / RF_F5 / RF_F6)
 * GET /api/caixa -> retorna o caixa aberto (com movimentações e saldos) e o histórico de caixas
 */

import { CaixaController } from '@/server/CaixaController';
import { respostaDeErro } from '@/server/http';

export async function GET() {
  try {
    const estado = await CaixaController.getInstancia().obterEstadoAtual();
    return Response.json(estado);
  } catch (erro) {
    return respostaDeErro(erro);
  }
}
