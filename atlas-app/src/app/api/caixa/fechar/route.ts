/**
 * API de fechamento de caixa (RF_F5 - Fechar Caixa)
 * POST /api/caixa/fechar -> fecha o caixa aberto com conferência de saldos (apenas Gerente autenticado)
 */

import { exigirGerente } from '@/server/auth';
import { CaixaController } from '@/server/CaixaController';
import { respostaDeErro } from '@/server/http';
import { lerJson } from '@/server/lerJson';

export async function POST(request: Request) {
  try {
    const corpo = (await lerJson(request)) as Record<string, unknown>;
    const gerente = await exigirGerente(request, corpo);

    const resultado = await CaixaController.getInstancia().fecharCaixa(
      {
        saldoFisicoFinal: corpo.saldoFisicoFinal,
        saldoDigitalFinal: corpo.saldoDigitalFinal,
        confirmarComRessalva: Boolean(corpo.confirmarComRessalva),
        justificativa: typeof corpo.justificativa === 'string' ? corpo.justificativa : null,
      },
      gerente.getId()!
    );

    return Response.json(resultado, { status: 200 });
  } catch (erro) {
    return respostaDeErro(erro);
  }
}
