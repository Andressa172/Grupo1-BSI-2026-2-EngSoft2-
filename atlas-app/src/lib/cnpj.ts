/**
 * Validação de CNPJ numérico e alfanumérico (IN RFB 2.229/2024) via Módulo 11.
 */

const PESOS_DV1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] as const;
const PESOS_DV2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] as const;

export function sanitizarCNPJ(cnpj: string): string {
  return cnpj.replace(/[.\-/\s]/g, '').toUpperCase();
}

function calcularDigitoVerificador(valores: number[], pesos: readonly number[]): number {
  let soma = 0;
  for (let i = 0; i < pesos.length; i++) {
    soma += valores[i] * pesos[i];
  }
  const resto = soma % 11;
  return resto === 0 || resto === 1 ? 0 : 11 - resto;
}

export function validarCNPJ(cnpj: string): boolean {
  if (typeof cnpj !== 'string') return false;

  const limpo = sanitizarCNPJ(cnpj);
  if (!/^[A-Z0-9]{12}[0-9]{2}$/.test(limpo)) {
    return false;
  }

  if (/^(.)\1{13}$/.test(limpo)) {
    return false;
  }

  const valoresBase: number[] = [];
  for (let i = 0; i < 12; i++) {
    valoresBase.push(limpo.charCodeAt(i) - 48);
  }

  const dv1Calculado = calcularDigitoVerificador(valoresBase, PESOS_DV1);
  if (dv1Calculado !== Number(limpo[12])) {
    return false;
  }

  const dv2Calculado = calcularDigitoVerificador([...valoresBase, dv1Calculado], PESOS_DV2);
  return dv2Calculado === Number(limpo[13]);
}
