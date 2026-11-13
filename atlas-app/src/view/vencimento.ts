/** Helpers de validade de produto (View): dias até vencer, formatação e checagens de data. */

const DIAS_ALERTA_VENCIMENTO = 30;

/** "2026-12-20" -> Date à meia-noite local. */
function paraDataLocal(iso: string): Date {
  const [ano, mes, dia] = iso.split('-').map(Number);
  return new Date(ano, mes - 1, dia);
}

/** "dd/mm/aaaa" -> Date à meia-noite local, ou null se incompleta/inválida. */
export function brParaDataLocal(texto: string): Date | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto);
  if (!m) return null;
  const data = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  return Number.isNaN(data.getTime()) ? null : data;
}

export function hojeLocal(): Date {
  const h = new Date();
  h.setHours(0, 0, 0, 0);
  return h;
}

/** Dias entre hoje e a data de validade (negativo = já venceu). */
export function diasParaVencer(dataValidadeIso: string): number {
  const alvo = paraDataLocal(dataValidadeIso);
  return Math.round((alvo.getTime() - hojeLocal().getTime()) / 86_400_000);
}

export function formatarDataBR(iso: string): string {
  return paraDataLocal(iso).toLocaleDateString('pt-BR');
}

/** Produtos com validade vencida ou vencendo nos próximos 30 dias. */
export function produtosProximosDoVencimento<T extends { data_validade: string | null }>(produtos: T[]): T[] {
  return produtos.filter((p) => p.data_validade !== null && diasParaVencer(p.data_validade) <= DIAS_ALERTA_VENCIMENTO);
}

/** Aviso de "este produto estará vencido na data escolhida", ou null se não houver problema. */
export function avisoVencimentoNaData(dataValidadeIso: string | null, dataEscolhidaBR: string): string | null {
  if (!dataValidadeIso) return null;
  const escolhida = brParaDataLocal(dataEscolhidaBR);
  if (!escolhida) return null;
  if (paraDataLocal(dataValidadeIso).getTime() < escolhida.getTime()) {
    return `Atenção: este produto estará vencido nessa data (validade ${formatarDataBR(dataValidadeIso)}).`;
  }
  return null;
}

/** Aviso de data retroativa (não bloqueia, só avisa). */
export function avisoDataRetroativa(dataEscolhidaBR: string): string | null {
  const escolhida = brParaDataLocal(dataEscolhidaBR);
  if (!escolhida) return null;
  return escolhida.getTime() < hojeLocal().getTime() ? 'Atenção: essa data já passou (cadastro retroativo).' : null;
}
