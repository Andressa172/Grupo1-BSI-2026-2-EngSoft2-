// Model - ItemCardapio: um alimento e a quantidade usada num cardápio diário (RF_F10).
import type { ErrosDeCampo } from '../erros';

const ID_MAXIMO = 2_147_483_647;

export class ItemCardapio {
  private readonly produtoId: number;
  private readonly quantidadeUtilizada: number;

  constructor(dados: unknown) {
    const d = typeof dados === 'object' && dados !== null ? (dados as Record<string, unknown>) : {};
    this.produtoId =
      typeof d.produtoId === 'number' || (typeof d.produtoId === 'string' && d.produtoId.trim() !== '')
        ? Number(d.produtoId)
        : NaN;
    this.quantidadeUtilizada =
      typeof d.quantidadeUtilizada === 'number' || (typeof d.quantidadeUtilizada === 'string' && d.quantidadeUtilizada.trim() !== '')
        ? Number(d.quantidadeUtilizada)
        : NaN;
  }

  getProdutoId(): number {
    return this.produtoId;
  }

  getQuantidadeUtilizada(): number {
    return this.quantidadeUtilizada;
  }

  // só o formato; se o produto existe e é um Alimento quem garante é o DAO (regra de negócio, não de campo)
  validar(): ErrosDeCampo {
    const erros: ErrosDeCampo = {};
    if (!Number.isInteger(this.produtoId) || this.produtoId <= 0 || this.produtoId > ID_MAXIMO) {
      erros.produtoId = 'Selecione um alimento cadastrado.';
    }
    if (!Number.isInteger(this.quantidadeUtilizada) || this.quantidadeUtilizada <= 0) {
      erros.quantidadeUtilizada = 'A quantidade deve ser um número inteiro maior que zero.';
    }
    return erros;
  }
}
