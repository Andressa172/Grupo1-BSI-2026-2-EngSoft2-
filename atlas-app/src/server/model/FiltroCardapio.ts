// Model - critérios da consulta de cardápios (RF_F10): período da data e tipo de refeição.
import type { ErrosDeCampo } from '../erros';
import { dataValida, paraIso, parseData, textoSeguro } from './datasBR';
import { TIPOS_REFEICAO, type TipoRefeicao } from './CardapioDiario';

export interface FiltroCardapioAtributos {
  dataInicial?: string | null; // dd/mm/aaaa ou aaaa-mm-dd
  dataFinal?: string | null;
  tipoRefeicao?: string | null;
}

export class FiltroCardapio {
  private readonly dataInicial: string;
  private readonly dataFinal: string;
  private readonly tipoRefeicao: string;

  constructor(atributos: FiltroCardapioAtributos = {}) {
    this.dataInicial = textoSeguro(atributos.dataInicial);
    this.dataFinal = textoSeguro(atributos.dataFinal);
    this.tipoRefeicao = textoSeguro(atributos.tipoRefeicao);
  }

  getDataInicial(): string | null {
    return this.dataInicial === '' ? null : paraIso(parseData(this.dataInicial));
  }

  getDataFinal(): string | null {
    return this.dataFinal === '' ? null : paraIso(parseData(this.dataFinal));
  }

  getTipoRefeicao(): TipoRefeicao | '' {
    return this.tipoRefeicao as TipoRefeicao | '';
  }

  validar(): ErrosDeCampo {
    const erros: ErrosDeCampo = {};
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
    if (this.tipoRefeicao !== '' && !(TIPOS_REFEICAO as readonly string[]).includes(this.tipoRefeicao)) {
      erros.tipoRefeicao = 'Tipo de refeição inválido.';
    }
    return erros;
  }
}
