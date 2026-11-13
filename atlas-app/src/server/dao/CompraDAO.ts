// DAO - Compra (RF_F2 - Lançar entrada de compras). Só executa SQL, sempre com parâmetros.
// A entrada no estoque não é feita aqui: é do model MovimentacaoEstoque (RF_F1).
import type { ExecutorSQL } from './tipos';
import { Database } from '../db/Database';
import type { FiltroCompra } from '../model/FiltroCompra';
import type { ItemCompra } from '../model/ItemCompra';
import { paraIso } from '../model/datasBR';

export interface CompraRegistro {
  id: number;
  numeroNF: string;
  data: string; // aaaa-mm-dd
  fornecedor: string;
  valorTotal: number;
  itens: {
    produtoId: number;
    produto: string;
    unidadeMedida: string;
    quantidade: number;
    valorUnitario: number;
    dataValidade: string | null;
  }[];
}

interface LinhaConsulta {
  id: number;
  numero_nf: string;
  data: string;
  fornecedor: string;
  valor_total: string; // NUMERIC chega como texto
  produto_id: number;
  produto: string;
  unidade_medida: string;
  quantidade: number;
  valor_unitario: string;
  data_validade: string | null;
}

export class CompraDAO {
  constructor(private readonly executor: ExecutorSQL = Database.getInstancia()) {}

  // a comparação ignora maiúsculas/minúsculas: "nf-10" e "NF-10" são a mesma nota
  async existeNotaFiscal(numeroNF: string): Promise<boolean> {
    const resultado = await this.executor.query('SELECT 1 FROM compra WHERE upper(numero_nf) = upper($1)', [numeroNF]);
    return (resultado.rowCount ?? 0) > 0;
  }

  async inserirCompra(numeroNF: string, dataIso: string, fornecedor: string, valorTotal: number): Promise<number> {
    const resultado = await this.executor.query<{ id: number }>(
      'INSERT INTO compra (numero_nf, data, fornecedor, valor_total) VALUES ($1, $2, $3, $4) RETURNING id',
      [numeroNF, dataIso, fornecedor, valorTotal.toFixed(2)]
    );
    return resultado.rows[0].id;
  }

  async inserirItem(compraId: number, item: ItemCompra): Promise<void> {
    const validade = item.getDataValidade() ? paraIso(item.getDataValidade() as Date) : null;
    await this.executor.query(
      `INSERT INTO item_compra (compra_id, produto_id, quantidade, valor_unitario, data_validade)
       VALUES ($1, $2, $3, $4, $5)`,
      [compraId, item.getProdutoId(), item.getQuantidade(), item.getValorUnitario().toFixed(2), validade]
    );
  }

  // filtros (nota fiscal, fornecedor e período) se combinam com AND; filtro vazio traz todas as compras
  async consultar(filtro: FiltroCompra): Promise<CompraRegistro[]> {
    const condicoes: string[] = [];
    const parametros: unknown[] = [];

    if (filtro.getNumeroNF() !== '') {
      parametros.push(`%${filtro.getNumeroNF()}%`);
      condicoes.push(`c.numero_nf ILIKE $${parametros.length}`);
    }
    if (filtro.getFornecedor() !== '') {
      parametros.push(`%${filtro.getFornecedor()}%`);
      condicoes.push(`c.fornecedor ILIKE $${parametros.length}`);
    }
    const de = filtro.getDataInicial();
    if (de !== null) {
      parametros.push(de);
      condicoes.push(`c.data >= $${parametros.length}::date`);
    }
    const ate = filtro.getDataFinal();
    if (ate !== null) {
      parametros.push(ate);
      condicoes.push(`c.data <= $${parametros.length}::date`);
    }
    const where = condicoes.length > 0 ? `WHERE ${condicoes.join(' AND ')}` : '';

    const resultado = await this.executor.query<LinhaConsulta>(
      `SELECT c.id, c.numero_nf, to_char(c.data, 'YYYY-MM-DD') AS data, c.fornecedor, c.valor_total,
              i.produto_id, p.nome AS produto, p.unidade_medida, i.quantidade, i.valor_unitario,
              to_char(i.data_validade, 'YYYY-MM-DD') AS data_validade
         FROM compra c
         JOIN item_compra i ON i.compra_id = c.id
         JOIN produto p ON p.id = i.produto_id
         ${where}
        ORDER BY c.data DESC, c.id DESC, i.id`,
      parametros
    );

    // junta as linhas (uma por item) em uma compra com a lista de itens
    const porId = new Map<number, CompraRegistro>();
    for (const l of resultado.rows) {
      let compra = porId.get(l.id);
      if (!compra) {
        compra = {
          id: l.id,
          numeroNF: l.numero_nf,
          data: l.data,
          fornecedor: l.fornecedor,
          valorTotal: Number(l.valor_total),
          itens: [],
        };
        porId.set(l.id, compra);
      }
      compra.itens.push({
        produtoId: l.produto_id,
        produto: l.produto,
        unidadeMedida: l.unidade_medida,
        quantidade: l.quantidade,
        valorUnitario: Number(l.valor_unitario),
        dataValidade: l.data_validade,
      });
    }
    return [...porId.values()];
  }
}
