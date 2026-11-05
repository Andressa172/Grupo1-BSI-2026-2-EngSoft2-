// Model - ItemCardapio (RF_F10)
import { ErroValidacao } from '../erros';

export interface ItemCardapioAtributos {
  id?: number;
  cardapioId?: number;
  produtoId: number;
  quantidadeUtilizada: number;
}

export class ItemCardapio {
  private id?: number;
  private cardapioId?: number;
  private produtoId: number;
  private quantidadeUtilizada: number;

  constructor(atributos: ItemCardapioAtributos) {
    this.id = atributos.id;
    this.cardapioId = atributos.cardapioId;
    this.produtoId = atributos.produtoId;
    this.quantidadeUtilizada = atributos.quantidadeUtilizada;
  }

  getId(): number | undefined {
    return this.id;
  }

  setId(id: number): void {
    this.id = id;
  }

  setCardapioId(cardapioId: number): void {
    this.cardapioId = cardapioId;
  }

  getCardapioId(): number | undefined {
    return this.cardapioId;
  }

  getProdutoId(): number {
    return this.produtoId;
  }

  getQuantidadeUtilizada(): number {
    return this.quantidadeUtilizada;
  }

  validar(): void {
    if (!this.produtoId) {
      throw new ErroValidacao('Selecione um alimento para o cardápio.');
    }
    if (!this.quantidadeUtilizada || this.quantidadeUtilizada <= 0) {
      throw new ErroValidacao('A quantidade utilizada deve ser maior que zero.');
    }
  }

  paraLinhaDeDados() {
    return {
      id: this.id,
      cardapioId: this.cardapioId,
      produtoId: this.produtoId,
      quantidadeUtilizada: this.quantidadeUtilizada,
    };
  }
}
