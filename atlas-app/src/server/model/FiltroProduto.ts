// Model - FiltroProduto (consulta do RF_B3)
// Critérios da consulta de produtos:
//   1) nome      - contém o texto digitado ('' = todos)
//   2) categoria - uma das categorias de Produto ('' = todas)
//   3) validade  - situação da validade ('' = todas)
import type { ErrosDeCampo } from '../erros';
import { CATEGORIAS_PRODUTO } from './Produto';

export const SITUACOES_VALIDADE = {
  VENCIDOS: 'Vencidos',
  VENCE_EM_30_DIAS: 'Vencem em até 30 dias',
  SEM_VALIDADE: 'Sem validade',
} as const;

export type SituacaoValidade = keyof typeof SITUACOES_VALIDADE;

export interface FiltroProdutoAtributos {
  nome?: string | null;
  categoria?: string | null;
  validade?: string | null;
}

export class FiltroProduto {
  private readonly nome: string;
  private readonly categoria: string;
  private readonly validade: string;

  constructor(atributos: FiltroProdutoAtributos = {}) {
    this.nome = atributos.nome?.trim() ?? '';
    this.categoria = atributos.categoria?.trim() ?? '';
    this.validade = atributos.validade?.trim() ?? '';
  }

  getNome(): string {
    return this.nome;
  }

  getCategoria(): string {
    return this.categoria;
  }

  getValidade(): SituacaoValidade | '' {
    return this.validade as SituacaoValidade | '';
  }

  validar(): ErrosDeCampo {
    const erros: ErrosDeCampo = {};
    if (this.nome.length > 120) {
      erros.nome = 'Digite no máximo 120 caracteres.';
    }
    if (this.categoria !== '' && !(CATEGORIAS_PRODUTO as readonly string[]).includes(this.categoria)) {
      erros.categoria = 'Categoria inválida.';
    }
    if (this.validade !== '' && !(this.validade in SITUACOES_VALIDADE)) {
      erros.validade = 'Situação de validade inválida.';
    }
    return erros;
  }
}
