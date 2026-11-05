// DAO - ItemCardapio (RF_F10)
import type { ExecutorSQL } from './tipos';
import { Database } from '../db/Database';
import { ItemCardapio } from '../model/ItemCardapio';

interface ItemCardapioLinha {
  id: number;
  cardapio_id: number;
  produto_id: number;
  quantidade_utilizada: number;
}

function linhaParaItem(linha: ItemCardapioLinha): ItemCardapio {
  return new ItemCardapio({
    id: linha.id,
    cardapioId: linha.cardapio_id,
    produtoId: linha.produto_id,
    quantidadeUtilizada: linha.quantidade_utilizada,
  });
}

export class ItemCardapioDAO {
  constructor(private readonly executor: ExecutorSQL = Database.getInstancia()) {}

  async listarPorCardapio(cardapioId: number): Promise<ItemCardapio[]> {
    const resultado = await this.executor.query<ItemCardapioLinha>(
      'SELECT id, cardapio_id, produto_id, quantidade_utilizada FROM item_cardapio WHERE cardapio_id = $1 ORDER BY id',
      [cardapioId]
    );
    return resultado.rows.map(linhaParaItem);
  }

  async inserir(item: ItemCardapio): Promise<ItemCardapio> {
    const dados = item.paraLinhaDeDados();
    const resultado = await this.executor.query<ItemCardapioLinha>(
      `INSERT INTO item_cardapio (cardapio_id, produto_id, quantidade_utilizada)
       VALUES ($1, $2, $3)
       RETURNING id, cardapio_id, produto_id, quantidade_utilizada`,
      [dados.cardapioId, dados.produtoId, dados.quantidadeUtilizada]
    );
    return linhaParaItem(resultado.rows[0]);
  }
}
