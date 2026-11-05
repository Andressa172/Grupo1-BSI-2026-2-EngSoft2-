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
