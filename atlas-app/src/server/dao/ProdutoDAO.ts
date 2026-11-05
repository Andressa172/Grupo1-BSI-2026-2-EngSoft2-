// DAO - Produto
// - listarTodos / decrementarEstoque / registrarMovimentacao: usados pelos controles de F9/F10
// - demais métodos: CRUD do RF_B3 (Gerenciar produtos), trabalhando com o model Produto
import type { ExecutorSQL } from './tipos';
import { Database } from '../db/Database';
import { Produto } from '../model/Produto';
import { paraDataSimples } from './datas';
import { ErroRegraDeNegocio } from '../erros';

export interface ProdutoLinha {
  id: number;
  nome: string;
  unidade_medida: string;
  quantidade_estoque: number;
  estoque_minimo: number;
}

interface ProdutoLinhaCompleta extends ProdutoLinha {
  categoria: string;
  data_validade: string | Date | null;
}

const COLUNAS = 'id, nome, categoria, unidade_medida, quantidade_estoque, estoque_minimo, data_validade';

function linhaParaProduto(linha: ProdutoLinhaCompleta): Produto {
  return new Produto({
    id: linha.id,
    nome: linha.nome,
    categoria: linha.categoria,
    unidadeMedida: linha.unidade_medida,
    quantidadeEstoque: linha.quantidade_estoque,
    estoqueMinimo: linha.estoque_minimo,
    dataValidade: linha.data_validade ? paraDataSimples(linha.data_validade) : null,
  });
}

export class ProdutoDAO {
  constructor(private readonly executor: ExecutorSQL = Database.getInstancia()) {}

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

  // ------------------------- RF_B3 - Gerenciar produtos -------------------------

  async listarProdutos(): Promise<Produto[]> {
    const resultado = await this.executor.query<ProdutoLinhaCompleta>(`SELECT ${COLUNAS} FROM produto ORDER BY nome`);
    return resultado.rows.map(linhaParaProduto);
  }

  async buscarPorId(id: number): Promise<Produto | null> {
    const resultado = await this.executor.query<ProdutoLinhaCompleta>(`SELECT ${COLUNAS} FROM produto WHERE id = $1`, [id]);
    return resultado.rows[0] ? linhaParaProduto(resultado.rows[0]) : null;
  }

  async existeComNome(nome: string, idIgnorado?: number): Promise<boolean> {
    const resultado = await this.executor.query<{ id: number }>(
      'SELECT id FROM produto WHERE lower(nome) = lower($1) AND ($2::int IS NULL OR id <> $2)',
      [nome, idIgnorado ?? null]
    );
    return resultado.rows.length > 0;
  }

  // a quantidade em estoque não entra: produto novo começa com 0 (valor padrão da tabela)
  async inserir(produto: Produto): Promise<Produto> {
    const dados = produto.paraLinhaDeDados();
    const resultado = await this.executor.query<ProdutoLinhaCompleta>(
      `INSERT INTO produto (nome, categoria, unidade_medida, estoque_minimo, data_validade)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING ${COLUNAS}`,
      [dados.nome, dados.categoria, dados.unidadeMedida, dados.estoqueMinimo, dados.dataValidade]
    );
    return linhaParaProduto(resultado.rows[0]);
  }

  // também não altera a quantidade em estoque, que só muda por movimentação (RF_F1)
  async atualizar(produto: Produto): Promise<Produto | null> {
    const dados = produto.paraLinhaDeDados();
    const resultado = await this.executor.query<ProdutoLinhaCompleta>(
      `UPDATE produto
          SET nome = $1, categoria = $2, unidade_medida = $3, estoque_minimo = $4, data_validade = $5
        WHERE id = $6
    RETURNING ${COLUNAS}`,
      [dados.nome, dados.categoria, dados.unidadeMedida, dados.estoqueMinimo, dados.dataValidade, dados.id]
    );
    return resultado.rows[0] ? linhaParaProduto(resultado.rows[0]) : null;
  }

  async excluir(id: number): Promise<boolean> {
    try {
      const resultado = await this.executor.query('DELETE FROM produto WHERE id = $1', [id]);
      return (resultado.rowCount ?? 0) > 0;
    } catch (erro) {
      // 23503 = violação de chave estrangeira: o produto já aparece em movimentação,
      // compra, doação, cotação, cardápio ou alocação, então não pode ser apagado
      if ((erro as { code?: string }).code === '23503') {
        throw new ErroRegraDeNegocio('Este produto já foi usado no sistema e não pode ser excluído.');
      }
      throw erro;
    }
  }
}
