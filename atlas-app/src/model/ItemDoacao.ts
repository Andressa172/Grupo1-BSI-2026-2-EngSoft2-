import { type ErrosValidacao, dataValida } from './validacao';

/** Item de uma doação de produto (associação DoacaoProduto x Produto). */
export class ItemDoacao {
  constructor(
    public produtoId: string,
    public quantidade: number,
    /** Opcional ("quando aplicável"). Invalid Date = texto informado inválido. */
    public dataValidade?: Date
  ) {}

  /** RF_F3 fluxos 5.1 (produto), 5.2 (quantidade) e 5.3 (data de validade). */
  validar(idsProdutosValidos: string[], dataRecebimento: Date): ErrosValidacao {
    const erros: ErrosValidacao = {};
    if (!this.produtoId || !idsProdutosValidos.includes(this.produtoId)) {
      erros.produto = 'Produto inválido: selecione um produto cadastrado.';
    }
    if (!Number.isInteger(this.quantidade) || this.quantidade <= 0) {
      erros.quantidade = 'Quantidade inválida: informe um número inteiro maior que zero.';
    }
    if (this.dataValidade !== undefined) {
      if (!dataValida(this.dataValidade)) {
        erros.dataValidade = 'Data de validade inválida: use o formato dd/mm/aaaa.';
      } else if (dataValida(dataRecebimento) && this.dataValidade < dataRecebimento) {
        erros.dataValidade = 'Data de validade inválida: o produto já está vencido na data de recebimento.';
      }
    }
    return erros;
  }
}
