// Model - critérios da consulta de doações (RF_F3 / RF_F11): doador e período.
import type { ErrosDeCampo } from '../erros';
import { dataValida, paraIso, parseData, textoSeguro } from './datasBR';

const ID_MAXIMO = 2_147_483_647;

export interface FiltroDoacaoAtributos {
  doadorId?: string | number | null;
  dataInicial?: string | null; // dd/mm/aaaa ou aaaa-mm-dd
  dataFinal?: string | null;
}

export class FiltroDoacao {
  private readonly doadorId: string;
  private readonly dataInicial: string;
  private readonly dataFinal: string;

  constructor(atributos: FiltroDoacaoAtributos = {}) {
    this.doadorId = textoSeguro(typeof atributos.doadorId === 'number' ? String(atributos.doadorId) : atributos.doadorId);
    this.dataInicial = textoSeguro(atributos.dataInicial);
    this.dataFinal = textoSeguro(atributos.dataFinal);
  }

  /** null = todos os doadores. Só chamar com filtro válido. */
  getDoadorId(): number | null {
    return this.doadorId === '' ? null : Number(this.doadorId);
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

    if (this.doadorId !== '') {
      const id = Number(this.doadorId);
      if (!/^\d{1,10}$/.test(this.doadorId) || id <= 0 || id > ID_MAXIMO) erros.doadorId = 'Doador inválido.';
    }
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
