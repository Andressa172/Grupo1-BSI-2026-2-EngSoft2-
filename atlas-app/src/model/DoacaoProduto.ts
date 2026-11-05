import { ItemDoacao } from './ItemDoacao';
import { type ErrosValidacao, dataValida, hoje } from './validacao';

/** Entidade DoacaoProduto (RF_F3). Mantém a lista de itens da doação. */
export class DoacaoProduto {
  private itens: ItemDoacao[] = [];

  constructor(public dataRecebimento: Date) {}

  adicionarItem(item: ItemDoacao): void {
    this.itens.push(item);
  }

  getItens(): readonly ItemDoacao[] {
    return this.itens;
  }

  validar(idsProdutosValidos: string[]): ErrosValidacao {
    const erros: ErrosValidacao = {};
    if (!dataValida(this.dataRecebimento)) {
      erros.dataRecebimento = 'Data de recebimento inválida: use o formato dd/mm/aaaa.';
    } else if (this.dataRecebimento > hoje()) {
      erros.dataRecebimento = 'Data de recebimento inválida: não pode ser uma data futura.';
    }
    if (this.itens.length === 0) {
      erros.itens = 'Informe ao menos um item da doação.';
    }
    this.itens.forEach((item, i) => {
      const errosItem = item.validar(idsProdutosValidos, this.dataRecebimento);
      for (const campo of Object.keys(errosItem)) erros[`item.${i}.${campo}`] = errosItem[campo];
    });
    return erros;
  }
}
