// Model - ItemDoacao: um produto e a quantidade recebida numa doação de produto (RF_F3).
import type { ErrosDeCampo } from '../erros';
import { dataValida, parseData, textoSeguro } from './datasBR';

const ID_MAXIMO = 2_147_483_647;
const QUANTIDADE_MAXIMA = 1_000_000;

export class ItemDoacao {
  private readonly produtoId: number;
  private readonly quantidade: number;
  // null = não informada (opcional, "quando aplicável")
  private readonly dataValidade: Date | null;
  private readonly textoValidade: string;

  constructor(dados: unknown) {
    const d = typeof dados === 'object' && dados !== null ? (dados as Record<string, unknown>) : {};
    this.produtoId = typeof d.produtoId === 'number' || (typeof d.produtoId === 'string' && d.produtoId.trim() !== '')
      ? Number(d.produtoId)
      : NaN;
    // '' ou texto que não é número vira NaN e cai na validação
    this.quantidade =
      typeof d.quantidade === 'number' || (typeof d.quantidade === 'string' && d.quantidade.trim() !== '')
        ? Number(d.quantidade)
        : NaN;
    this.textoValidade = textoSeguro(d.dataValidade);
    this.dataValidade = this.textoValidade === '' ? null : parseData(this.textoValidade);
  }

  getProdutoId(): number {
    return this.produtoId;
  }

  getQuantidade(): number {
    return this.quantidade;
  }

  getDataValidade(): Date | null {
    return this.dataValidade;
  }

  /** RF_F3 fluxos 5.1 (produto), 5.2 (quantidade) e 5.3 (data de validade). */
  validar(dataRecebimento: Date): ErrosDeCampo {
    const erros: ErrosDeCampo = {};
    if (!Number.isInteger(this.produtoId) || this.produtoId <= 0 || this.produtoId > ID_MAXIMO) {
      erros.produto = 'Produto inválido: selecione um produto cadastrado.';
    }
    if (!Number.isInteger(this.quantidade) || this.quantidade <= 0) {
      erros.quantidade = 'Quantidade inválida: informe um número inteiro maior que zero.';
    } else if (this.quantidade > QUANTIDADE_MAXIMA) {
      erros.quantidade = 'Quantidade inválida: acima do limite de 1.000.000.';
    }
    if (this.dataValidade !== null) {
      if (!dataValida(this.dataValidade)) {
        erros.dataValidade = 'Data de validade inválida: use o formato dd/mm/aaaa.';
      } else if (dataValida(dataRecebimento) && this.dataValidade < dataRecebimento) {
        erros.dataValidade = 'Data de validade inválida: o produto já está vencido na data de recebimento.';
      }
    }
    return erros;
  }
}
