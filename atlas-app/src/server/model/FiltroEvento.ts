// Model - critérios da consulta de eventos (RF_F9): nome e período da data do evento.
import type { ErrosDeCampo } from '../erros';
import { dataValida, paraIso, parseData, textoSeguro } from './datasBR';

export interface FiltroEventoAtributos {
  nome?: string | null;
  dataInicial?: string | null; // dd/mm/aaaa ou aaaa-mm-dd
  dataFinal?: string | null;
}

export class FiltroEvento {
  private readonly nome: string;
  private readonly dataInicial: string;
  private readonly dataFinal: string;

  constructor(atributos: FiltroEventoAtributos = {}) {
    this.nome = textoSeguro(atributos.nome);
    this.dataInicial = textoSeguro(atributos.dataInicial);
    this.dataFinal = textoSeguro(atributos.dataFinal);
  }

  getNome(): string {
    return this.nome;
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
    if (this.nome.length > 120) erros.nome = 'Nome muito longo.';
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
