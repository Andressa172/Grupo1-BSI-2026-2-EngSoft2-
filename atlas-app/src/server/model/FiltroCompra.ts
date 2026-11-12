// Model - critérios da consulta de compras (RF_F2): nota fiscal, fornecedor e período.
import type { ErrosDeCampo } from '../erros';
import { dataValida, paraIso, parseData, textoSeguro } from './datasBR';

const TAMANHO_MAXIMO_TEXTO = 120;

export interface FiltroCompraAtributos {
  numeroNF?: string | null;
  fornecedor?: string | null;
  dataInicial?: string | null; // dd/mm/aaaa ou aaaa-mm-dd
  dataFinal?: string | null;
}

// % e _ são curingas do ILIKE: escapados, o texto digitado é procurado literalmente
function escaparCuringas(texto: string): string {
  return texto.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export class FiltroCompra {
  private readonly numeroNF: string;
  private readonly fornecedor: string;
  private readonly dataInicial: string;
  private readonly dataFinal: string;

  constructor(atributos: FiltroCompraAtributos = {}) {
    this.numeroNF = textoSeguro(atributos.numeroNF);
    this.fornecedor = textoSeguro(atributos.fornecedor);
    this.dataInicial = textoSeguro(atributos.dataInicial);
    this.dataFinal = textoSeguro(atributos.dataFinal);
  }

  /** Parte do número da nota ('' = todas), já pronta para o ILIKE. */
  getNumeroNF(): string {
    return escaparCuringas(this.numeroNF);
  }

  /** Parte do nome do fornecedor ('' = todos), já pronta para o ILIKE. */
  getFornecedor(): string {
    return escaparCuringas(this.fornecedor);
  }

  /** "aaaa-mm-dd" ou null (sem limite). Só chamar com filtro válido. */
  getDataInicial(): string | null {
    return this.dataInicial === '' ? null : paraIso(parseData(this.dataInicial));
  }

  getDataFinal(): string | null {
    return this.dataFinal === '' ? null : paraIso(parseData(this.dataFinal));
  }

  validar(): ErrosDeCampo {
    const erros: ErrosDeCampo = {};

    if (this.numeroNF.length > TAMANHO_MAXIMO_TEXTO) erros.numeroNF = 'Texto muito longo.';
    if (this.fornecedor.length > TAMANHO_MAXIMO_TEXTO) erros.fornecedor = 'Texto muito longo.';
    if (this.dataInicial !== '' && !dataValida(parseData(this.dataInicial))) {
      erros.dataInicial = 'Informe uma data válida (dd/mm/aaaa).';
    }
    if (this.dataFinal !== '' && !dataValida(parseData(this.dataFinal))) {
      erros.dataFinal = 'Informe uma data válida (dd/mm/aaaa).';
    }
    if (!erros.dataInicial && !erros.dataFinal && this.dataInicial !== '' && this.dataFinal !== '') {
      if (parseData(this.dataInicial).getTime() > parseData(this.dataFinal).getTime()) {
        erros.dataFinal = 'A data final não pode ser anterior à data inicial.';
      }
    }
    return erros;
  }
}
