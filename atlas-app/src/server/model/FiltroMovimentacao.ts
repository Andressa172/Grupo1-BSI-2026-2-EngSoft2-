// Model - critérios da consulta do histórico de estoque (RF_F1): produto, tipo e período.
import type { ErrosDeCampo } from '../erros';
import { dataValida, paraIso, parseData, textoSeguro } from './datasBR';

const ID_MAXIMO = 2_147_483_647;
const TIPOS = ['ENTRADA', 'SAIDA'] as const;

export interface FiltroMovimentacaoAtributos {
  produtoId?: string | number | null;
  tipo?: string | null;
  dataInicial?: string | null; // dd/mm/aaaa ou aaaa-mm-dd
  dataFinal?: string | null;
}

export class FiltroMovimentacao {
  private readonly produtoId: string;
  private readonly tipo: string;
  private readonly dataInicial: string;
  private readonly dataFinal: string;

  constructor(atributos: FiltroMovimentacaoAtributos = {}) {
    this.produtoId = textoSeguro(typeof atributos.produtoId === 'number' ? String(atributos.produtoId) : atributos.produtoId);
    this.tipo = textoSeguro(atributos.tipo).toUpperCase();
    this.dataInicial = textoSeguro(atributos.dataInicial);
    this.dataFinal = textoSeguro(atributos.dataFinal);
  }

  /** null = todos os produtos. Só chamar com filtro válido. */
  getProdutoId(): number | null {
    return this.produtoId === '' ? null : Number(this.produtoId);
  }

  /** null = entradas e saídas. */
  getTipo(): 'ENTRADA' | 'SAIDA' | null {
    return this.tipo === '' ? null : (this.tipo as 'ENTRADA' | 'SAIDA');
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

    if (this.produtoId !== '') {
      const id = Number(this.produtoId);
      if (!/^\d{1,10}$/.test(this.produtoId) || id <= 0 || id > ID_MAXIMO) erros.produtoId = 'Produto inválido.';
    }
    if (this.tipo !== '' && !(TIPOS as readonly string[]).includes(this.tipo)) {
      erros.tipo = 'Tipo inválido: use entrada ou saída.';
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
