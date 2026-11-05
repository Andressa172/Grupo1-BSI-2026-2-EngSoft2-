/**
 * Utilitários de conversão e validação usados pelas entidades (Model).
 * Datas chegam como texto dd/mm/aaaa e valores como "1.234,56".
 */

/** Mapa campo -> mensagem de erro. Vazio = dados válidos. */
export type ErrosValidacao = Record<string, string>;

/** Converte "dd/mm/aaaa" em Date (meio-dia UTC). Retorna Invalid Date se o texto for inválido. */
export function parseDataBR(texto: string): Date {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto.trim());
  if (!m) return new Date(NaN);
  const dia = Number(m[1]);
  const mes = Number(m[2]);
  const ano = Number(m[3]);
  const data = new Date(Date.UTC(ano, mes - 1, dia, 12));
  const ok = data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia;
  return ok ? data : new Date(NaN);
}

/** Converte "1.234,56" em número. Retorna NaN se o texto for inválido. */
export function parseValorBR(texto: string): number {
  const limpo = texto.replace(/\./g, '').replace(',', '.').trim();
  return /^\d+(\.\d{1,2})?$/.test(limpo) ? Number(limpo) : NaN;
}

export function dataValida(d: Date): boolean {
  return !Number.isNaN(d.getTime());
}

/** Hoje às 12:00 UTC, para comparar com as datas de parseDataBR. */
export function hoje(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate(), 12));
}
