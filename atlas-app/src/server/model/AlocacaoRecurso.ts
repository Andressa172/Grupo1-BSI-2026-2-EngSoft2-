// Model - AlocacaoRecurso: um recurso (produto ou financeiro) alocado para um evento (RF_F9).
import type { ErrosDeCampo } from '../erros';
import { textoSeguro } from './datasBR';

export type TipoRecurso = 'PRODUTO' | 'FINANCEIRO';
const ID_MAXIMO = 2_147_483_647;

export class AlocacaoRecurso {
  private readonly tipo: TipoRecurso | '';
  private readonly produtoId: number;
  private readonly quantidade: number;
  private readonly valor: number;

  constructor(dados: unknown) {
    const d = typeof dados === 'object' && dados !== null ? (dados as Record<string, unknown>) : {};
    const tipo = textoSeguro(d.tipo);
    this.tipo = tipo === 'PRODUTO' || tipo === 'FINANCEIRO' ? tipo : '';
    this.produtoId =
      typeof d.produtoId === 'number' || (typeof d.produtoId === 'string' && d.produtoId.trim() !== '')
        ? Number(d.produtoId)
        : NaN;
    this.quantidade =
      typeof d.quantidade === 'number' || (typeof d.quantidade === 'string' && d.quantidade.trim() !== '')
        ? Number(d.quantidade)
        : NaN;
    this.valor = typeof d.valor === 'number' || (typeof d.valor === 'string' && d.valor.trim() !== '') ? Number(d.valor) : NaN;
  }

  getTipo(): TipoRecurso | '' {
    return this.tipo;
  }

  getProdutoId(): number {
    return this.produtoId;
  }

  getQuantidade(): number {
    return this.quantidade;
  }

  getValor(): number {
    return this.valor;
  }

  validar(): ErrosDeCampo {
    const erros: ErrosDeCampo = {};

    if (this.tipo === '') {
      erros.tipo = 'Selecione o tipo do recurso.';
      return erros;
    }

    if (this.tipo === 'PRODUTO') {
      if (!Number.isInteger(this.produtoId) || this.produtoId <= 0 || this.produtoId > ID_MAXIMO) {
        erros.produtoId = 'Selecione um produto cadastrado.';
      }
      if (!Number.isInteger(this.quantidade) || this.quantidade <= 0) {
        erros.quantidade = 'A quantidade deve ser um número inteiro maior que zero.';
      }
    } else {
      if (!Number.isFinite(this.valor) || this.valor <= 0) {
        erros.valor = 'O valor deve ser maior que zero.';
      }
    }

    return erros;
  }

  paraLinhaDeDados() {
    return {
      tipo: this.tipo,
      produtoId: this.tipo === 'PRODUTO' ? this.produtoId : null,
      quantidade: this.tipo === 'PRODUTO' ? this.quantidade : null,
      valor: this.tipo === 'FINANCEIRO' ? this.valor : null,
    };
  }
}
