// Model - ItemCompra: um produto comprado, com quantidade, valor unitário e validade (RF_F2).
import type { ErrosDeCampo } from '../erros';
import { dataValida, parseData, parseValor, textoSeguro } from './datasBR';

const ID_MAXIMO = 2_147_483_647;
const QUANTIDADE_MAXIMA = 1_000_000;
const VALOR_UNITARIO_MAXIMO = 1_000_000;

export class ItemCompra {
  private readonly produtoId: number;
  private readonly quantidade: number;
  private readonly valorUnitario: number;
  // null = não informada (opcional, "quando aplicável")
  private readonly dataValidade: Date | null;

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
    this.valorUnitario = parseValor(d.valorUnitario);
    const textoValidade = textoSeguro(d.dataValidade);
    this.dataValidade = textoValidade === '' ? null : parseData(textoValidade);
  }

  getProdutoId(): number {
    return this.produtoId;
  }

  getQuantidade(): number {
    return this.quantidade;
  }

  getValorUnitario(): number {
    return this.valorUnitario;
  }

  getDataValidade(): Date | null {
    return this.dataValidade;
  }

  /** Passo 4: valor total do item, em centavos inteiros para não errar a soma (0,10 + 0,20). */
  getValorTotalEmCentavos(): number {
    return Math.round(this.valorUnitario * 100) * this.quantidade;
  }

  /** RF_F2 fluxos 3.1 (produto) e 4.1 (dados do produto inválidos). */
  validar(dataCompra: Date): ErrosDeCampo {
    const erros: ErrosDeCampo = {};
    if (!Number.isInteger(this.produtoId) || this.produtoId <= 0 || this.produtoId > ID_MAXIMO) {
      erros.produto = 'Produto inválido: selecione um produto cadastrado.';
    }
    if (!Number.isInteger(this.quantidade) || this.quantidade <= 0) {
      erros.quantidade = 'Quantidade inválida: informe um número inteiro maior que zero.';
    } else if (this.quantidade > QUANTIDADE_MAXIMA) {
      erros.quantidade = 'Quantidade inválida: acima do limite de 1.000.000.';
    }
    if (!Number.isFinite(this.valorUnitario) || this.valorUnitario <= 0) {
      erros.valorUnitario = 'Valor unitário inválido: informe um valor maior que zero (ex.: 12,50).';
    } else if (this.valorUnitario > VALOR_UNITARIO_MAXIMO) {
      erros.valorUnitario = 'Valor unitário inválido: acima do limite de R$ 1.000.000,00.';
    }
    if (this.dataValidade !== null) {
      if (!dataValida(this.dataValidade)) {
        erros.dataValidade = 'Data de validade inválida: use o formato dd/mm/aaaa.';
      } else if (dataValida(dataCompra) && this.dataValidade < dataCompra) {
        erros.dataValidade = 'Data de validade inválida: o produto já está vencido na data da compra.';
      }
    }
    return erros;
  }
}
