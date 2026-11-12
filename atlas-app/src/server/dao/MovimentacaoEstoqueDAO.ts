// DAO - MovimentacaoEstoque (RF_F1 - Atualizar estoque)
// Único lugar do sistema que altera produto.quantidade_estoque e grava em movimentacao_estoque.
// Doação de produto (RF_F3), cardápio (RF_F10), eventos (RF_F9) e o ajuste manual chegam aqui
// pelo model MovimentacaoEstoque. Só executa SQL, sempre com parâmetros.
import type { ExecutorSQL } from './tipos';
import { Database } from '../db/Database';
import type { FiltroMovimentacao } from '../model/FiltroMovimentacao';

export interface MovimentacaoEstoqueRegistro {
  id: number;
  produtoId: number;
  produto: string;
  unidadeMedida: string;
  tipo: 'ENTRADA' | 'SAIDA';
  quantidade: number;
  data: string; // aaaa-mm-dd hh:mm
  origem: string;
  dataValidade: string | null; // aaaa-mm-dd
}

interface LinhaConsulta {
  id: number;
  produto_id: number;
  produto: string;
  unidade_medida: string;
  tipo: 'ENTRADA' | 'SAIDA';
  quantidade: number;
  data: string;
  origem: string;
  data_validade: string | null;
}

// a consulta devolve no máximo esta quantidade de linhas (as mais recentes)
const LIMITE_CONSULTA = 500;

export class MovimentacaoEstoqueDAO {
  constructor(private readonly executor: ExecutorSQL = Database.getInstancia()) {}

  /**
   * Soma no estoque. Se veio validade, o produto fica com a mais próxima entre a atual e a nova.
   * Devolve false se o produto não existe.
   */
  async somarAoEstoque(produtoId: number, quantidade: number, dataValidadeIso: string | null): Promise<boolean> {
    const resultado = await this.executor.query(
      `UPDATE produto
          SET quantidade_estoque = quantidade_estoque + $1,
              data_validade = CASE
                WHEN $3::date IS NULL THEN data_validade
                WHEN quantidade_estoque = 0 OR data_validade IS NULL THEN $3::date
                ELSE LEAST(data_validade, $3::date)
              END
        WHERE id = $2
    RETURNING id`,
      [quantidade, produtoId, dataValidadeIso]
    );
    return (resultado.rowCount ?? 0) > 0;
  }

  /**
   * Subtrai do estoque de forma atômica: a condição no WHERE impede ficar abaixo de zero.
   * Quando o estoque zera, a validade é limpa (não sobrou nada que possa vencer).
   * Devolve false se o produto não existe ou não tem saldo suficiente.
   */
  async subtrairDoEstoque(produtoId: number, quantidade: number): Promise<boolean> {
    const resultado = await this.executor.query(
      `UPDATE produto
          SET quantidade_estoque = quantidade_estoque - $1,
              data_validade = CASE WHEN quantidade_estoque - $1 = 0 THEN NULL ELSE data_validade END
        WHERE id = $2 AND quantidade_estoque >= $1
    RETURNING id`,
      [quantidade, produtoId]
    );
    return (resultado.rowCount ?? 0) > 0;
  }

  async produtoExiste(produtoId: number): Promise<boolean> {
    const resultado = await this.executor.query('SELECT 1 FROM produto WHERE id = $1', [produtoId]);
    return (resultado.rowCount ?? 0) > 0;
  }

  async inserir(
    produtoId: number,
    tipo: 'ENTRADA' | 'SAIDA',
    quantidade: number,
    origem: string,
    dataValidadeIso: string | null
  ): Promise<number> {
    // data no horário de Brasília: com o servidor em UTC, uma movimentação depois das 21h
    // cairia no dia seguinte e sairia errada no histórico e nos filtros por período
    const resultado = await this.executor.query<{ id: number }>(
      `INSERT INTO movimentacao_estoque (produto_id, tipo, quantidade, origem, data_validade, data)
       VALUES ($1, $2, $3, $4, $5, now() AT TIME ZONE 'America/Sao_Paulo') RETURNING id`,
      [produtoId, tipo, quantidade, origem, dataValidadeIso]
    );
    return resultado.rows[0].id;
  }

  // filtros (produto, tipo e período) se combinam com AND; filtro vazio traz as mais recentes
  async consultar(filtro: FiltroMovimentacao): Promise<MovimentacaoEstoqueRegistro[]> {
    const condicoes: string[] = [];
    const parametros: unknown[] = [];

    const produtoId = filtro.getProdutoId();
    if (produtoId !== null) {
      parametros.push(produtoId);
      condicoes.push(`m.produto_id = $${parametros.length}`);
    }
    const tipo = filtro.getTipo();
    if (tipo !== null) {
      parametros.push(tipo);
      condicoes.push(`m.tipo = $${parametros.length}`);
    }
    const de = filtro.getDataInicial();
    if (de !== null) {
      parametros.push(de);
      condicoes.push(`m.data::date >= $${parametros.length}::date`);
    }
    const ate = filtro.getDataFinal();
    if (ate !== null) {
      parametros.push(ate);
      condicoes.push(`m.data::date <= $${parametros.length}::date`);
    }
    const where = condicoes.length > 0 ? `WHERE ${condicoes.join(' AND ')}` : '';

    const resultado = await this.executor.query<LinhaConsulta>(
      `SELECT m.id, m.produto_id, p.nome AS produto, p.unidade_medida, m.tipo, m.quantidade,
              to_char(m.data, 'YYYY-MM-DD HH24:MI') AS data, m.origem,
              to_char(m.data_validade, 'YYYY-MM-DD') AS data_validade
         FROM movimentacao_estoque m
         JOIN produto p ON p.id = m.produto_id
         ${where}
        ORDER BY m.data DESC, m.id DESC
        LIMIT ${LIMITE_CONSULTA}`,
      parametros
    );
    return resultado.rows.map((l) => ({
      id: l.id,
      produtoId: l.produto_id,
      produto: l.produto,
      unidadeMedida: l.unidade_medida,
      tipo: l.tipo,
      quantidade: l.quantidade,
      data: l.data,
      origem: l.origem,
      dataValidade: l.data_validade,
    }));
  }
}
