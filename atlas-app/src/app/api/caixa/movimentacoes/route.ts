/**
 * API de movimentações manuais do caixa (RF_F6 - Atualizar Caixa)
 * POST /api/caixa/movimentacoes -> registra entrada ou saída no caixa aberto (apenas Gerente autenticado)
 */

import { exigirGerente } from '@/server/auth';
import { CaixaController } from '@/server/CaixaController';
import { respostaDeErro } from '@/server/http';
import { lerJson } from '@/server/lerJson';
import type { FormaPagamentoCaixa, TipoMovimentacaoCaixa } from '@/server/model/MovimentacaoCaixa';

export async function POST(request: Request) {
  try {
    const corpo = (await lerJson(request)) as Record<string, unknown>;
    await exigirGerente(request, corpo);

    const movimentacao = await CaixaController.getInstancia().atualizarCaixa({
      valor: corpo.valor as number,
      tipoMovimentacao: corpo.tipoMovimentacao as TipoMovimentacaoCaixa,
      formaPag: corpo.formaPag as FormaPagamentoCaixa,
      origem: typeof corpo.origem === 'string' ? corpo.origem : undefined,
    });

    return Response.json(movimentacao, { status: 201 });
  } catch (erro) {
    return respostaDeErro(erro);
  }
}
