import { describe, expect, it } from 'vitest';
import { validarCNPJ } from './cnpj';

describe('validarCNPJ (numérico e alfanumérico RFB 2.229/2024)', () => {
  it('aceita CNPJ numérico válido formatado e sem máscara', () => {
    expect(validarCNPJ('18.236.120/0001-58')).toBe(true);
    expect(validarCNPJ('18236120000158')).toBe(true);
  });

  it('rejeita CNPJ numérico com dígitos verificadores alterados', () => {
    expect(validarCNPJ('18.236.120/0001-59')).toBe(false);
    expect(validarCNPJ('18.236.120/0001-48')).toBe(false);
  });

  it('aceita CNPJ alfanumérico válido (case-insensitive)', () => {
    expect(validarCNPJ('12.ABC.345/01DE-35')).toBe(true);
    expect(validarCNPJ('12abc34501de35')).toBe(true);
  });

  it('rejeita CNPJ alfanumérico com DV inválido ou letra no DV', () => {
    expect(validarCNPJ('12.ABC.345/01DE-36')).toBe(false);
    expect(validarCNPJ('12.ABC.345/01DE-3A')).toBe(false);
  });

  it('rejeita sequências repetidas, tamanho incorreto ou caracteres inválidos', () => {
    expect(validarCNPJ('00.000.000/0000-00')).toBe(false);
    expect(validarCNPJ('11.111.111/1111-11')).toBe(false);
    expect(validarCNPJ('AA.AAA.AAA/AAAA-00')).toBe(false);
    expect(validarCNPJ('123')).toBe(false);
    expect(validarCNPJ('')).toBe(false);
    expect(validarCNPJ('18.236.120/0001-589')).toBe(false);
  });
});
