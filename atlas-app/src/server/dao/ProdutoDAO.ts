// DAO - Produto
// - listarTodos: lista simples, usada pelas telas de cardápio (RF_F10) e eventos (RF_F9)
// - demais métodos: CRUD do RF_B3 (Gerenciar produtos). Quem cria este DAO é o
//   model Produto, com a conexão que recebe do ProdutoController.
// - buscarPorIdParaAtualizar / atualizarEstoque: usados só pelo RF_F1 (Atualizar estoque), via model Produto.
import type { ExecutorSQL } from './tipos';
import { Database } from '../db/Database';
import { Produto } from '../model/Produto';
import type { FiltroProduto } from '../model/FiltroProduto';
import { paraDataSimples } from './datas';
import { ErroRegraDeNegocio } from '../erros';

export interface ProdutoLinha {
  id: number;
  nome: string;
  categoria: string;
  unidade_medida: string;
  quantidade_estoque: number;
  estoque_minimo: number;
  data_validade: string | null; // aaaa-mm-dd
}

interface ProdutoLinhaCompleta extends Omit<ProdutoLinha, 'data_validade'> {
  data_validade: string | Date | null;
  numero_lote: string | null;
}

const COLUNAS = 'id, nome, categoria, unidade_medida, quantidade_estoque, estoque_minimo, data_validade, numero_lote';

function linhaParaProduto(linha: ProdutoLinhaCompleta): Produto {
  return new Produto({
    id: linha.id,
    nome: linha.nome,
    categoria: linha.categoria,
    unidadeMedida: linha.unidade_medida,
    quantidadeEstoque: linha.quantidade_estoque,
    estoqueMinimo: linha.estoque_minimo,
    dataValidade: linha.data_validade ? paraDataSimples(linha.data_validade) : null,
    numeroLote: linha.numero_lote,
  });
}

export class ProdutoDAO {
  constructor(private readonly executor: ExecutorSQL = Database.getInstancia()) {}

  async listarTodos(): Promise<ProdutoLinha[]> {
    const resultado = await this.executor.query<ProdutoLinha>(
      `SELECT id, nome, categoria, unidade_medida, quantidade_estoque, estoque_minimo,
              to_char(data_validade, 'YYYY-MM-DD') AS data_validade
         FROM produto ORDER BY nome`
    );
    return resultado.rows;
  }

  // ------------------------- RF_B3 - Gerenciar produtos -------------------------

  // consulta com os filtros da tela; filtro vazio traz todos os produtos
  async consultar(filtro: FiltroProduto): Promise<Produto[]> {
    const condicoes: string[] = [];
    const parametros: unknown[] = [];

    if (filtro.getNome() !== '') {
      parametros.push(`%${filtro.getNome()}%`);
      condicoes.push(`nome ILIKE $${parametros.length}`);
    }
    if (filtro.getCategoria() !== '') {
      parametros.push(filtro.getCategoria());
      condicoes.push(`categoria = $${parametros.length}`);
    }
    switch (filtro.getValidade()) {
      case 'VENCIDOS':
        condicoes.push('data_validade < CURRENT_DATE');
        break;
      case 'VENCE_EM_30_DIAS':
        condicoes.push("data_validade BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'");
        break;
      case 'SEM_VALIDADE':
        condicoes.push('data_validade IS NULL');
        break;
    }

    const where = condicoes.length > 0 ? `WHERE ${condicoes.join(' AND ')}` : '';
    const resultado = await this.executor.query<ProdutoLinhaCompleta>(
      `SELECT ${COLUNAS} FROM produto ${where} ORDER BY nome`,
      parametros
    );
    return resultado.rows.map(linhaParaProduto);
  }

  async buscarPorId(id: number): Promise<Produto | null> {
    const resultado = await this.executor.query<ProdutoLinhaCompleta>(`SELECT ${COLUNAS} FROM produto WHERE id = $1`, [id]);
    return resultado.rows[0] ? linhaParaProduto(resultado.rows[0]) : null;
  }

  // FOR UPDATE: trava a linha até o fim da transação (RF_F1)
  async buscarPorIdParaAtualizar(id: number): Promise<Produto | null> {
    const resultado = await this.executor.query<ProdutoLinhaCompleta>(
      `SELECT ${COLUNAS} FROM produto WHERE id = $1 FOR UPDATE`,
      [id]
    );
    return resultado.rows[0] ? linhaParaProduto(resultado.rows[0]) : null;
  }

  async atualizarEstoque(id: number, quantidadeEstoque: number, dataValidade: string | null): Promise<void> {
    await this.executor.query('UPDATE produto SET quantidade_estoque = $1, data_validade = $2 WHERE id = $3', [
      quantidadeEstoque,
      dataValidade,
      id,
    ]);
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
      `INSERT INTO produto (nome, categoria, unidade_medida, estoque_minimo, data_validade, numero_lote)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${COLUNAS}`,
      [dados.nome, dados.categoria, dados.unidadeMedida, dados.estoqueMinimo, dados.dataValidade, dados.numeroLote]
    );
    return linhaParaProduto(resultado.rows[0]);
  }

  // também não altera a quantidade em estoque, que só muda por movimentação (RF_F1)
  async atualizar(produto: Produto): Promise<Produto | null> {
    const dados = produto.paraLinhaDeDados();
    const resultado = await this.executor.query<ProdutoLinhaCompleta>(
      `UPDATE produto
          SET nome = $1, categoria = $2, unidade_medida = $3, estoque_minimo = $4, data_validade = $5, numero_lote = $6
        WHERE id = $7
    RETURNING ${COLUNAS}`,
      [dados.nome, dados.categoria, dados.unidadeMedida, dados.estoqueMinimo, dados.dataValidade, dados.numeroLote, dados.id]
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
