/**
 * API de abertura de caixa (RF_F4 - Abrir Caixa)
 * POST /api/caixa/abrir -> abre um novo caixa (apenas Gerente autenticado)
 */

import { exigirGerente } from '@/server/auth';
import { CaixaController } from '@/server/CaixaController';
import { respostaDeErro } from '@/server/http';
import { lerJson } from '@/server/lerJson';

export async function POST(request: Request) {
  try {
    const corpo = (await lerJson(request)) as Record<string, unknown>;
    const gerente = await exigirGerente(request, corpo);

    const caixa = await CaixaController.getInstancia().abrirCaixa(
      {
        saldoFisicoInicial: corpo.saldoFisicoInicial,
        saldoDigitalInicial: corpo.saldoDigitalInicial,
      },
      gerente.getId()!
    );

    return Response.json(caixa, { status: 201 });
  } catch (erro) {
    return respostaDeErro(erro);
  }
}
