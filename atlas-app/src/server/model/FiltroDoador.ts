// Model - critérios da consulta de doadores (RF_B4): nome, tipo de pessoa e anônimo.
import type { ErrosDeCampo } from '../erros';
import { textoSeguro } from './datasBR';

export interface FiltroDoadorAtributos {
  nome?: string | null;
  tipoPessoa?: string | null;
  anonimo?: string | null; // 'sim' | 'nao' | '' (todos)
}

export class FiltroDoador {
  private readonly nome: string;
  private readonly tipoPessoa: string;
  private readonly anonimo: string;

  constructor(atributos: FiltroDoadorAtributos = {}) {
    this.nome = textoSeguro(atributos.nome);
    this.tipoPessoa = textoSeguro(atributos.tipoPessoa);
    this.anonimo = textoSeguro(atributos.anonimo);
  }

  getNome(): string {
    return this.nome;
  }

  getTipoPessoa(): string {
    return this.tipoPessoa;
  }

  /** null = os dois (não filtra por anônimo) */
  getAnonimo(): boolean | null {
    if (this.anonimo === 'sim') return true;
    if (this.anonimo === 'nao') return false;
    return null;
  }

  validar(): ErrosDeCampo {
    const erros: ErrosDeCampo = {};
    if (this.nome.length > 120) erros.nome = 'Nome muito longo.';
    if (this.tipoPessoa !== '' && this.tipoPessoa !== 'FISICA' && this.tipoPessoa !== 'JURIDICA') {
      erros.tipoPessoa = 'Tipo de pessoa inválido.';
    }
    if (this.anonimo !== '' && this.anonimo !== 'sim' && this.anonimo !== 'nao') {
      erros.anonimo = 'Filtro de anônimo inválido.';
    }
    return erros;
  }
}
