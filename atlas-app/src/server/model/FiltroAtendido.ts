// Model - critérios da consulta de atendidos (RF_B1): nome, sexo e faixa de idade.
import type { ErrosDeCampo } from '../erros';
import { textoSeguro } from './datasBR';

export interface FiltroAtendidoAtributos {
  nome?: string | null;
  sexo?: string | null;
  idadeMinima?: string | number | null;
  idadeMaxima?: string | number | null;
}

export class FiltroAtendido {
  private readonly nome: string;
  private readonly sexo: string;
  private readonly idadeMinima: string;
  private readonly idadeMaxima: string;

  constructor(atributos: FiltroAtendidoAtributos = {}) {
    this.nome = textoSeguro(atributos.nome);
    this.sexo = textoSeguro(atributos.sexo);
    this.idadeMinima = textoSeguro(atributos.idadeMinima === undefined ? '' : String(atributos.idadeMinima ?? ''));
    this.idadeMaxima = textoSeguro(atributos.idadeMaxima === undefined ? '' : String(atributos.idadeMaxima ?? ''));
  }

  getNome(): string {
    return this.nome;
  }

  getSexo(): string {
    return this.sexo;
  }

  /** null = sem limite. Só chamar com filtro válido. */
  getIdadeMinima(): number | null {
    return this.idadeMinima === '' ? null : Number(this.idadeMinima);
  }

  getIdadeMaxima(): number | null {
    return this.idadeMaxima === '' ? null : Number(this.idadeMaxima);
  }

  validar(): ErrosDeCampo {
    const erros: ErrosDeCampo = {};
    if (this.nome.length > 120) erros.nome = 'Nome muito longo.';
    if (this.idadeMinima !== '' && !/^\d{1,3}$/.test(this.idadeMinima)) erros.idadeMinima = 'Idade inválida.';
    if (this.idadeMaxima !== '' && !/^\d{1,3}$/.test(this.idadeMaxima)) erros.idadeMaxima = 'Idade inválida.';
    if (!erros.idadeMinima && !erros.idadeMaxima && this.idadeMinima !== '' && this.idadeMaxima !== '') {
      if (Number(this.idadeMinima) > Number(this.idadeMaxima)) {
        erros.idadeMaxima = 'A idade máxima não pode ser menor que a mínima.';
      }
    }
    return erros;
  }
}
