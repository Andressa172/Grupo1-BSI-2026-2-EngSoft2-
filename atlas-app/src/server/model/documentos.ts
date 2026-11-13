// Validação de CPF/CNPJ pelos dígitos verificadores (RF_B4).

function digitoCPF(d: string, ate: number): number {
  let soma = 0;
  for (let i = 0; i < ate; i++) soma += Number(d[i]) * (ate + 1 - i);
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

export function cpfValido(valor: string): boolean {
  const d = valor.replace(/\D/g, '');
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  return digitoCPF(d, 9) === Number(d[9]) && digitoCPF(d, 10) === Number(d[10]);
}

const PESOS_CNPJ_1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const PESOS_CNPJ_2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

function digitoCNPJ(d: string, pesos: number[]): number {
  let soma = 0;
  for (let i = 0; i < pesos.length; i++) soma += Number(d[i]) * pesos[i];
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

export function cnpjValido(valor: string): boolean {
  const d = valor.replace(/\D/g, '');
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  return digitoCNPJ(d, PESOS_CNPJ_1) === Number(d[12]) && digitoCNPJ(d, PESOS_CNPJ_2) === Number(d[13]);
}

/** valida de acordo com o tipo de pessoa (física usa CPF, jurídica usa CNPJ) */
export function cpfOuCnpjValido(valor: string, tipoPessoa: 'FISICA' | 'JURIDICA'): boolean {
  return tipoPessoa === 'FISICA' ? cpfValido(valor) : cnpjValido(valor);
}
