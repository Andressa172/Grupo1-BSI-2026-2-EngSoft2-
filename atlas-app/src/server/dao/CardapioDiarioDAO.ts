// DAO - CardapioDiario (RF_F10). Só executa SQL, sempre com parâmetros.
import type { ExecutorSQL } from './tipos';
import { Database } from '../db/Database';
import type { TipoRefeicao } from '../model/CardapioDiario';
import type { FiltroCardapio } from '../model/FiltroCardapio';

export interface CardapioRegistro {
  id: number;
  data: string; // aaaa-mm-dd
  tipoRefeicao: TipoRefeicao;
  itens: { id: number; produtoId: number; produto: string; quantidadeUtilizada: number }[];
}

interface LinhaConsulta {
  id: number;
  data: string;
  tipo_refeicao: TipoRefeicao;
  item_id: number | null;
  produto_id: number | null;
  produto: string | null;
  quantidade_utilizada: number | null;
}

export interface ItemCardapioRegistrado {
  produtoId: number;
  quantidadeUtilizada: number;
}

export class CardapioDiarioDAO {
  private static instancia: CardapioDiarioDAO | undefined;

  constructor(private readonly executor: ExecutorSQL = Database.getInstancia()) {}

  static getInstancia(): CardapioDiarioDAO {
    if (!CardapioDiarioDAO.instancia) {
      CardapioDiarioDAO.instancia = new CardapioDiarioDAO();
    }
    return CardapioDiarioDAO.instancia;
  }

  async existeParaDataETipo(dataIso: string, tipoRefeicao: TipoRefeicao, idIgnorado?: number): Promise<boolean> {
    const resultado = await this.executor.query(
      'SELECT id FROM cardapio_diario WHERE data = $1 AND tipo_refeicao = $2 AND ($3::int IS NULL OR id <> $3)',
      [dataIso, tipoRefeicao, idIgnorado ?? null]
    );
    return resultado.rows.length > 0;
  }

  async existe(id: number): Promise<boolean> {
    const resultado = await this.executor.query('SELECT id FROM cardapio_diario WHERE id = $1', [id]);
    return resultado.rows.length > 0;
  }

  async inserirCardapio(dataIso: string, tipoRefeicao: TipoRefeicao): Promise<number> {
    const resultado = await this.executor.query<{ id: number }>(
      'INSERT INTO cardapio_diario (data, tipo_refeicao) VALUES ($1, $2) RETURNING id',
      [dataIso, tipoRefeicao]
    );
    return resultado.rows[0].id;
  }

  async atualizarCardapio(id: number, dataIso: string, tipoRefeicao: TipoRefeicao): Promise<void> {
    await this.executor.query('UPDATE cardapio_diario SET data = $1, tipo_refeicao = $2 WHERE id = $3', [
      dataIso,
      tipoRefeicao,
      id,
    ]);
  }

  /** Categoria do produto, ou null se ele não existe (o cardápio só aceita alimentos). */
  async buscarCategoriaProduto(produtoId: number): Promise<string | null> {
    const resultado = await this.executor.query<{ categoria: string }>('SELECT categoria FROM produto WHERE id = $1', [
      produtoId,
    ]);
    return resultado.rows[0]?.categoria ?? null;
  }

  async inserirItem(cardapioId: number, produtoId: number, quantidadeUtilizada: number): Promise<void> {
    await this.executor.query(
      'INSERT INTO item_cardapio (cardapio_id, produto_id, quantidade_utilizada) VALUES ($1, $2, $3)',
      [cardapioId, produtoId, quantidadeUtilizada]
    );
  }

  async listarItens(cardapioId: number): Promise<ItemCardapioRegistrado[]> {
    const resultado = await this.executor.query<{ produto_id: number; quantidade_utilizada: number }>(
      'SELECT produto_id, quantidade_utilizada FROM item_cardapio WHERE cardapio_id = $1',
      [cardapioId]
    );
    return resultado.rows.map((i) => ({ produtoId: i.produto_id, quantidadeUtilizada: i.quantidade_utilizada }));
  }

  async excluirItens(cardapioId: number): Promise<void> {
    await this.executor.query('DELETE FROM item_cardapio WHERE cardapio_id = $1', [cardapioId]);
  }

  async excluirCardapio(id: number): Promise<boolean> {
    const resultado = await this.executor.query('DELETE FROM cardapio_diario WHERE id = $1', [id]);
    return (resultado.rowCount ?? 0) > 0;
  }

  // filtros (período e tipo de refeição) se combinam com AND; filtro vazio traz todos
  async consultar(filtro: FiltroCardapio): Promise<CardapioRegistro[]> {
    const condicoes: string[] = [];
    const parametros: unknown[] = [];

    const de = filtro.getDataInicial();
    if (de !== null) {
      parametros.push(de);
      condicoes.push(`c.data >= $${parametros.length}`);
    }
    const ate = filtro.getDataFinal();
    if (ate !== null) {
      parametros.push(ate);
      condicoes.push(`c.data <= $${parametros.length}`);
    }
    if (filtro.getTipoRefeicao() !== '') {
      parametros.push(filtro.getTipoRefeicao());
      condicoes.push(`c.tipo_refeicao = $${parametros.length}`);
    }
    const where = condicoes.length > 0 ? `WHERE ${condicoes.join(' AND ')}` : '';

    const resultado = await this.executor.query<LinhaConsulta>(
      `SELECT c.id, to_char(c.data, 'YYYY-MM-DD') AS data, c.tipo_refeicao,
              i.id AS item_id, i.produto_id, p.nome AS produto, i.quantidade_utilizada
         FROM cardapio_diario c
         LEFT JOIN item_cardapio i ON i.cardapio_id = c.id
         LEFT JOIN produto p ON p.id = i.produto_id
         ${where}
        ORDER BY c.data DESC, c.id DESC, i.id`,
      parametros
    );

    const porId = new Map<number, CardapioRegistro>();
    for (const l of resultado.rows) {
      let cardapio = porId.get(l.id);
      if (!cardapio) {
        cardapio = { id: l.id, data: l.data, tipoRefeicao: l.tipo_refeicao, itens: [] };
        porId.set(l.id, cardapio);
      }
      if (l.item_id !== null && l.produto_id !== null && l.produto !== null && l.quantidade_utilizada !== null) {
        cardapio.itens.push({
          id: l.item_id,
          produtoId: l.produto_id,
          produto: l.produto,
          quantidadeUtilizada: l.quantidade_utilizada,
        });
      }
    }
    return [...porId.values()];
  }
}
