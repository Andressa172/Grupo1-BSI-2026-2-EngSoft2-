// DAO - Produto (usado pelos controles de F9/F10 pra checar e atualizar estoque)
import type { ExecutorSQL } from './tipos';
import { Database } from '../db/Database';

export interface ProdutoLinha {
  id: number;
  nome: string;
  unidade_medida: string;
  quantidade_estoque: number;
  estoque_minimo: number;
}

export class ProdutoDAO {
  constructor(private readonly executor: ExecutorSQL = Database.getInstancia()) {}

  async buscarPorId(id: number): Promise<ProdutoLinha | null> {
    const resultado = await this.executor.query<ProdutoLinha>(
      'SELECT id, nome, unidade_medida, quantidade_estoque, estoque_minimo FROM produto WHERE id = $1',
      [id]
    );
    return resultado.rows[0] ?? null;
  }

  async listarTodos(): Promise<ProdutoLinha[]> {
    const resultado = await this.executor.query<ProdutoLinha>(
      'SELECT id, nome, unidade_medida, quantidade_estoque, estoque_minimo FROM produto ORDER BY nome'
    );
    return resultado.rows;
  }

  // update atômico: a condição no WHERE evita decrementar abaixo de zero
  async decrementarEstoque(produtoId: number, quantidade: number): Promise<ProdutoLinha | null> {
    const resultado = await this.executor.query<ProdutoLinha>(
      `UPDATE produto
          SET quantidade_estoque = quantidade_estoque - $1
        WHERE id = $2 AND quantidade_estoque >= $1
    RETURNING id, nome, unidade_medida, quantidade_estoque, estoque_minimo`,
      [quantidade, produtoId]
    );
    return resultado.rows[0] ?? null;
  }

  async registrarMovimentacao(produtoId: number, tipo: 'ENTRADA' | 'SAIDA', quantidade: number, origem: string): Promise<void> {
    await this.executor.query(
      'INSERT INTO movimentacao_estoque (produto_id, tipo, quantidade, origem) VALUES ($1, $2, $3, $4)',
      [produtoId, tipo, quantidade, origem]
    );
  }
}
