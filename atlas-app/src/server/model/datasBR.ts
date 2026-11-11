// Conversões de data/valor usadas pelos Models (RF_B1, RF_F3, RF_F11).
// A tela envia datas como "dd/mm/aaaa" e valores como "1.234,56".

// Todas devolvem Date em meio-dia UTC (ou Invalid Date se o texto for inválido).

/** Aceita "dd/mm/aaaa" ou "aaaa-mm-dd". */
export function parseData(texto: unknown): Date {
  if (typeof texto !== 'string') return new Date(NaN);
  const t = texto.trim();
  let dia: number, mes: number, ano: number;
  let m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(t);
  if (m) {
    dia = Number(m[1]);
    mes = Number(m[2]);
    ano = Number(m[3]);
  } else if ((m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t))) {
    ano = Number(m[1]);
    mes = Number(m[2]);
    dia = Number(m[3]);
  } else {
    return new Date(NaN);
  }
  const data = new Date(Date.UTC(ano, mes - 1, dia, 12));
  const ok = data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia;
  return ok ? data : new Date(NaN);
}

/** Aceita "1.234,56", "1234,56" ou "1234.56" (sem lixo). NaN se inválido. */
export function parseValor(texto: unknown): number {
  if (typeof texto === 'number') return Number.isFinite(texto) ? texto : NaN;
  if (typeof texto !== 'string') return NaN;
  const t = texto.trim();
  const limpo = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t;
  return /^\d+(\.\d{1,2})?$/.test(limpo) ? Number(limpo) : NaN;
}

export function dataValida(d: Date): boolean {
  return !Number.isNaN(d.getTime());
}

/** Hoje às 12:00 UTC, para comparar com as datas acima. */
export function hoje(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate(), 12));
}

/** Date (meio-dia UTC) -> "aaaa-mm-dd", o formato que o PostgreSQL recebe e a API devolve. */
export function paraIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Só aceita texto; qualquer outra coisa (número, objeto, null) vira ''. Evita erro com JSON malformado. */
export function textoSeguro(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim() : '';
}
