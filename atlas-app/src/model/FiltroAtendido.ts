import { type ErrosValidacao } from './validacao';

/** Normaliza texto para comparar sem maiúsculas/acentos ("José" == "jose"). */
function normalizar(t: string): string {
  return t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/**
 * Critérios da consulta de atendidos (3 filtros, como no relatório RF_S5):
 *   1) nome   - contém o texto digitado
 *   2) sexo   - '' = todos
 *   3) idade  - faixa (mínima e/ou máxima), vazio = sem limite
 */
export class FiltroAtendido {
  constructor(
    public readonly nome: string = '',
    public readonly sexo: string = '',
    public readonly idadeMinima: string = '',
    public readonly idadeMaxima: string = ''
  ) {}

  validar(): ErrosValidacao {
    const erros: ErrosValidacao = {};
    const min = this.idadeMinima.trim();
    const max = this.idadeMaxima.trim();
    if (min !== '' && !/^\d{1,3}$/.test(min)) erros.idadeMinima = 'Idade inválida.';
    if (max !== '' && !/^\d{1,3}$/.test(max)) erros.idadeMaxima = 'Idade inválida.';
    if (!erros.idadeMinima && !erros.idadeMaxima && min !== '' && max !== '' && Number(min) > Number(max)) {
      erros.idadeMaxima = 'A idade máxima não pode ser menor que a mínima.';
    }
    return erros;
  }

  /** Supõe filtro válido. */
  aceita(nome: string, sexo: string, idade: number): boolean {
    if (this.nome.trim() !== '' && !normalizar(nome).includes(normalizar(this.nome))) return false;
    if (this.sexo !== '' && this.sexo !== sexo) return false;
    if (this.idadeMinima.trim() !== '' && idade < Number(this.idadeMinima)) return false;
    if (this.idadeMaxima.trim() !== '' && idade > Number(this.idadeMaxima)) return false;
    return true;
  }
}
