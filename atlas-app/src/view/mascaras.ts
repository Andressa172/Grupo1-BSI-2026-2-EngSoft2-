/** Máscaras de campos de formulário (View). Só formatam o texto digitado. */

export function mascaraData(valor: string): string {
  const d = valor.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

/** Digita-se só números; o resultado é "1.234,56". */
export function mascaraMoeda(valor: string): string {
  const d = valor.replace(/\D/g, '').slice(0, 11);
  if (!d) return '';
  const [inteiro, centavos] = (Number(d) / 100).toFixed(2).split('.');
  return `${inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${centavos}`;
}

export function mascaraTelefone(valor: string): string {
  const d = valor.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function dataHojeBR(): string {
  return new Date().toLocaleDateString('pt-BR');
}

/** Nome de pessoa: remove números e símbolos, mantém letras, espaço, apóstrofo e hífen. */
export function mascaraNome(valor: string): string {
  return valor.replace(/[^\p{L}\s'-]/gu, '').replace(/\s{2,}/g, ' ').slice(0, 80);
}

/** CNPJ (numérico ou alfanumérico): XX.XXX.XXX/XXXX-00 */
export function mascaraCNPJ(valor: string): string {
  const limpo = valor.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const base = limpo.slice(0, 12);
  const dv = limpo.slice(12).replace(/\D/g, '').slice(0, 2);
  const d = `${base}${dv}`;
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

/** CEP: 00000-000 */
export function mascaraCEP(valor: string): string {
  const d = valor.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

/** UF: apenas 2 letras maiúsculas. */
export function mascaraUF(valor: string): string {
  return valor.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 2);
}

/** Converte "1.234,56" (ou "1234.56") em number; retorna NaN se inválido. */
export function parseMoedaBR(valor: string): number {
  const t = valor.trim();
  if (!t) return NaN;
  const limpo = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t;
  return /^-?\d+(\.\d{1,2})?$/.test(limpo) ? Number(limpo) : NaN;
}
