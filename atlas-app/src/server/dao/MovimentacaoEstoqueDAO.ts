// DAO - MovimentacaoEstoque (RF_F1 - Atualizar estoque)
// Grava e consulta o histórico (movimentacao_estoque). A quantidade do produto é gravada pelo
// ProdutoDAO, via model Produto. Só executa SQL, sempre com parâmetros.
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
