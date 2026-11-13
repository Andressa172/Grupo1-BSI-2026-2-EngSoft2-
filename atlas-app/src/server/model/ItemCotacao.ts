// Model - ItemCotacao: um produto e a quantidade desejada em uma cotação (RF_F7).
// Valida os próprios atributos e persiste a si mesmo criando o CotacaoDAO com a conexão recebida do Controller.
import type { ErrosDeCampo } from '../erros';
import type { ExecutorSQL } from '../dao/tipos';
import { CotacaoDAO } from '../dao/CotacaoDAO';

const ID_MAXIMO = 2_147_483_647;
const QUANTIDADE_MAXIMA = 1_000_000;

export class ItemCotacao {
  private readonly produtoId: number;
  private readonly quantidadeDesejada: number;

  constructor(dados: unknown) {
    const d = typeof dados === 'object' && dados !== null ? (dados as Record<string, unknown>) : {};
    this.produtoId =
      typeof d.produtoId === 'number' || (typeof d.produtoId === 'string' && d.produtoId.trim() !== '')
        ? Number(d.produtoId)
        : NaN;

    const brutoQtd = d.quantidadeDesejada !== undefined ? d.quantidadeDesejada : d.quantidade;
    this.quantidadeDesejada =
      typeof brutoQtd === 'number' || (typeof brutoQtd === 'string' && brutoQtd.trim() !== '')
        ? Number(brutoQtd)
        : NaN;
  }

  getProdutoId(): number {
    return this.produtoId;
  }

  getQuantidadeDesejada(): number {
    return this.quantidadeDesejada;
  }

  /** RF_F7 passo 3 e fluxo alternativo 3.1: valida produto selecionado e quantidade desejada (> 0). */
  validar(): ErrosDeCampo {
    const erros: ErrosDeCampo = {};
    if (!Number.isInteger(this.produtoId) || this.produtoId <= 0 || this.produtoId > ID_MAXIMO) {
      erros.produto = 'Produto inválido: selecione um produto cadastrado.';
    }
    if (!Number.isInteger(this.quantidadeDesejada) || this.quantidadeDesejada <= 0) {
      erros.quantidadeDesejada = 'Quantidade desejada inválida: informe um número inteiro maior que zero.';
    } else if (this.quantidadeDesejada > QUANTIDADE_MAXIMA) {
      erros.quantidadeDesejada = 'Quantidade desejada inválida: acima do limite de 1.000.000.';
    }
    return erros;
  }

  /**
   * Persiste este item da cotação no banco criando o DAO com a conexão recebida do Controller.
   * Retorna false se o produto informado não estiver cadastrado no banco (Fluxo Alternativo 3.1).
   */
  async gravar(cotacaoId: number, conexao: ExecutorSQL): Promise<boolean> {
    return new CotacaoDAO(conexao).registrarItem(cotacaoId, this);
  }
}
