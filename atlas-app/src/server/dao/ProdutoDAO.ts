// DAO - Produto
// - listarTodos: lista simples, usada pelas telas de cardápio (RF_F10) e eventos (RF_F9)
// - demais métodos: CRUD do RF_B3 (Gerenciar produtos). Quem cria este DAO é o
//   model Produto, que passa a conexão (recebida do ProdutoController) em cada método.
// - O DAO não abre conexão nem cria Model: recebe a conexão e os dados por parâmetro e devolve
//   registros simples (ProdutoRegistro); quem monta o Produto é o Model.
// - buscarPorIdParaAtualizar / atualizarEstoque: usados só pelo RF_F1 (Atualizar estoque), via model Produto.
import type { ExecutorSQL } from './tipos';
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

// dados que o Model passa para gravar (sem a quantidade em estoque, que só muda por movimentação)
export interface ProdutoDados {
  id?: number;
  nome: string;
  categoria: string;
  unidadeMedida: string;
  estoqueMinimo: number;
  dataValidade: string | null; // aaaa-mm-dd
  numeroLote: string;
}

// registro lido do banco; o Model transforma em Produto
export interface ProdutoRegistro {
  id: number;
  nome: string;
  categoria: string;
  unidadeMedida: string;
  quantidadeEstoque: number;
  estoqueMinimo: number;
  dataValidade: string | null; // aaaa-mm-dd
  numeroLote: string | null;
}

const COLUNAS = 'id, nome, categoria, unidade_medida, quantidade_estoque, estoque_minimo, data_validade, numero_lote';

function linhaParaRegistro(linha: ProdutoLinhaCompleta): ProdutoRegistro {
  return {
    id: linha.id,
    nome: linha.nome,
    categoria: linha.categoria,
    unidadeMedida: linha.unidade_medida,
    quantidadeEstoque: linha.quantidade_estoque,
    estoqueMinimo: linha.estoque_minimo,
    dataValidade: linha.data_validade ? paraDataSimples(linha.data_validade) : null,
    numeroLote: linha.numero_lote,
  };
}

export class ProdutoDAO {
  // "conexao: ExecutorSQL" - ExecutorSQL é só o NOME de um tipo (poderia se chamar Conexao; o nome é estético).
  // Ele está definido em dao/tipos.ts e diz: "qualquer objeto que tenha o método query(sql, parametros)".
  // Serve para o DAO não saber de onde vem a conexão: pode ser o pool normal ou o client de uma transação
  // em aberto, e o DAO não cria nem guarda nada, só executa o SQL na conexão que o Controller abriu.
  async listarTodos(conexao: ExecutorSQL): Promise<ProdutoLinha[]> {
    const resultado = await conexao.query<ProdutoLinha>(
      `SELECT id, nome, categoria, unidade_medida, quantidade_estoque, estoque_minimo,
              to_char(data_validade, 'YYYY-MM-DD') AS data_validade
         FROM produto ORDER BY nome`
    );
    return resultado.rows;
  }

  // ------------------------- RF_B3 - Gerenciar produtos -------------------------

  // consulta com os filtros da tela; filtro vazio traz todos os produtos
  // "conexao: ExecutorSQL" - ExecutorSQL é só o NOME de um tipo (poderia se chamar Conexao; o nome é estético).
  // Ele está definido em dao/tipos.ts e diz: "qualquer objeto que tenha o método query(sql, parametros)".
  // Serve para o DAO não saber de onde vem a conexão: pode ser o pool normal ou o client de uma transação
  // em aberto, e o DAO não cria nem guarda nada, só executa o SQL na conexão que o Controller abriu.
  async consultar(conexao: ExecutorSQL, filtro: FiltroProduto): Promise<ProdutoRegistro[]> {
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
    const resultado = await conexao.query<ProdutoLinhaCompleta>(
      `SELECT ${COLUNAS} FROM produto ${where} ORDER BY nome`,
      parametros
    );
    return resultado.rows.map(linhaParaRegistro);
  }

  // "conexao: ExecutorSQL" - ExecutorSQL é só o NOME de um tipo (poderia se chamar Conexao; o nome é estético).
  // Ele está definido em dao/tipos.ts e diz: "qualquer objeto que tenha o método query(sql, parametros)".
  // Serve para o DAO não saber de onde vem a conexão: pode ser o pool normal ou o client de uma transação
  // em aberto, e o DAO não cria nem guarda nada, só executa o SQL na conexão que o Controller abriu.
  async buscarPorId(conexao: ExecutorSQL, id: number): Promise<ProdutoRegistro | null> {
    const resultado = await conexao.query<ProdutoLinhaCompleta>(`SELECT ${COLUNAS} FROM produto WHERE id = $1`, [id]);
    return resultado.rows[0] ? linhaParaRegistro(resultado.rows[0]) : null;
  }

  // FOR UPDATE: trava a linha até o fim da transação (RF_F1)
  // "conexao: ExecutorSQL" - ExecutorSQL é só o NOME de um tipo (poderia se chamar Conexao; o nome é estético).
  // Ele está definido em dao/tipos.ts e diz: "qualquer objeto que tenha o método query(sql, parametros)".
  // Serve para o DAO não saber de onde vem a conexão: pode ser o pool normal ou o client de uma transação
  // em aberto, e o DAO não cria nem guarda nada, só executa o SQL na conexão que o Controller abriu.
  async buscarPorIdParaAtualizar(conexao: ExecutorSQL, id: number): Promise<ProdutoRegistro | null> {
    const resultado = await conexao.query<ProdutoLinhaCompleta>(
      `SELECT ${COLUNAS} FROM produto WHERE id = $1 FOR UPDATE`,
      [id]
    );
    return resultado.rows[0] ? linhaParaRegistro(resultado.rows[0]) : null;
  }

  // "conexao: ExecutorSQL" - ExecutorSQL é só o NOME de um tipo (poderia se chamar Conexao; o nome é estético).
  // Ele está definido em dao/tipos.ts e diz: "qualquer objeto que tenha o método query(sql, parametros)".
  // Serve para o DAO não saber de onde vem a conexão: pode ser o pool normal ou o client de uma transação
  // em aberto, e o DAO não cria nem guarda nada, só executa o SQL na conexão que o Controller abriu.
  async atualizarEstoque(conexao: ExecutorSQL, id: number, quantidadeEstoque: number, dataValidade: string | null): Promise<void> {
    await conexao.query('UPDATE produto SET quantidade_estoque = $1, data_validade = $2 WHERE id = $3', [
      quantidadeEstoque,
      dataValidade,
      id,
    ]);
  }

  // "conexao: ExecutorSQL" - ExecutorSQL é só o NOME de um tipo (poderia se chamar Conexao; o nome é estético).
  // Ele está definido em dao/tipos.ts e diz: "qualquer objeto que tenha o método query(sql, parametros)".
  // Serve para o DAO não saber de onde vem a conexão: pode ser o pool normal ou o client de uma transação
  // em aberto, e o DAO não cria nem guarda nada, só executa o SQL na conexão que o Controller abriu.
  async existeComNome(conexao: ExecutorSQL, nome: string, idIgnorado?: number): Promise<boolean> {
    const resultado = await conexao.query<{ id: number }>(
      'SELECT id FROM produto WHERE lower(nome) = lower($1) AND ($2::int IS NULL OR id <> $2)',
      [nome, idIgnorado ?? null]
    );
    return resultado.rows.length > 0;
  }

  // a quantidade em estoque não entra: produto novo começa com 0 (valor padrão da tabela)
  // "conexao: ExecutorSQL" - ExecutorSQL é só o NOME de um tipo (poderia se chamar Conexao; o nome é estético).
  // Ele está definido em dao/tipos.ts e diz: "qualquer objeto que tenha o método query(sql, parametros)".
  // Serve para o DAO não saber de onde vem a conexão: pode ser o pool normal ou o client de uma transação
  // em aberto, e o DAO não cria nem guarda nada, só executa o SQL na conexão que o Controller abriu.
  async inserir(conexao: ExecutorSQL, dados: ProdutoDados): Promise<ProdutoRegistro> {
    const resultado = await conexao.query<ProdutoLinhaCompleta>(
      `INSERT INTO produto (nome, categoria, unidade_medida, estoque_minimo, data_validade, numero_lote)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${COLUNAS}`,
      [dados.nome, dados.categoria, dados.unidadeMedida, dados.estoqueMinimo, dados.dataValidade, dados.numeroLote]
    );
    return linhaParaRegistro(resultado.rows[0]);
  }

  // também não altera a quantidade em estoque, que só muda por movimentação (RF_F1)
  // "conexao: ExecutorSQL" - ExecutorSQL é só o NOME de um tipo (poderia se chamar Conexao; o nome é estético).
  // Ele está definido em dao/tipos.ts e diz: "qualquer objeto que tenha o método query(sql, parametros)".
  // Serve para o DAO não saber de onde vem a conexão: pode ser o pool normal ou o client de uma transação
  // em aberto, e o DAO não cria nem guarda nada, só executa o SQL na conexão que o Controller abriu.
  async atualizar(conexao: ExecutorSQL, dados: ProdutoDados): Promise<ProdutoRegistro | null> {
    const resultado = await conexao.query<ProdutoLinhaCompleta>(
      `UPDATE produto
          SET nome = $1, categoria = $2, unidade_medida = $3, estoque_minimo = $4, data_validade = $5, numero_lote = $6
        WHERE id = $7
    RETURNING ${COLUNAS}`,
      [dados.nome, dados.categoria, dados.unidadeMedida, dados.estoqueMinimo, dados.dataValidade, dados.numeroLote, dados.id]
    );
    return resultado.rows[0] ? linhaParaRegistro(resultado.rows[0]) : null;
  }

  // "conexao: ExecutorSQL" - ExecutorSQL é só o NOME de um tipo (poderia se chamar Conexao; o nome é estético).
  // Ele está definido em dao/tipos.ts e diz: "qualquer objeto que tenha o método query(sql, parametros)".
  // Serve para o DAO não saber de onde vem a conexão: pode ser o pool normal ou o client de uma transação
  // em aberto, e o DAO não cria nem guarda nada, só executa o SQL na conexão que o Controller abriu.
  async excluir(conexao: ExecutorSQL, id: number): Promise<boolean> {
    try {
      const resultado = await conexao.query('DELETE FROM produto WHERE id = $1', [id]);
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
