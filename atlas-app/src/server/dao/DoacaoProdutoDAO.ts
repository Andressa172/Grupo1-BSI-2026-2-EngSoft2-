// DAO - DoacaoProduto (RF_F3). Só executa SQL, sempre com parâmetros.
import type { ExecutorSQL } from './tipos';

// critérios da consulta, já prontos: o Model monta a partir do filtro e entrega ao DAO
export interface CriteriosConsultaDoacao {
  doadorId: number | null;
  somenteAnonimos: boolean;
  dataInicialIso: string | null;
  dataFinalIso: string | null;
}

export interface DoacaoProdutoRegistro {
  id: number;
  doadorId: number;
  doador: string;
  data: string; // aaaa-mm-dd
  itens: { produtoId: number; produto: string; quantidade: number; dataValidade: string | null }[];
}

interface LinhaConsulta {
  id: number;
  doador_id: number;
  doador: string;
  data: string;
  produto_id: number;
  produto: string;
  quantidade: number;
  data_validade: string | null;
}

export class DoacaoProdutoDAO {
  async inserirDoacao(executor: ExecutorSQL, doadorId: number, dataRecebimentoIso: string): Promise<number> {
    const resultado = await executor.query<{ id: number }>(
      'INSERT INTO doacao_produto (doador_id, data_recebimento) VALUES ($1, $2) RETURNING id',
      [doadorId, dataRecebimentoIso]
    );
    return resultado.rows[0].id;
  }

  /** Grava o item da doação. A entrada no estoque (RF_F1) é feita pelo Controller, com os Models de estoque. */
  async inserirItem(executor: ExecutorSQL, doacaoId: number, produtoId: number, quantidade: number, dataValidadeIso: string | null): Promise<void> {
    await executor.query(
      'INSERT INTO item_doacao (doacao_produto_id, produto_id, quantidade, data_validade) VALUES ($1, $2, $3, $4)',
      [doacaoId, produtoId, quantidade, dataValidadeIso]
    );
  }

  // filtros (doador e período) se combinam com AND; filtro vazio traz todas as doações
  async consultar(executor: ExecutorSQL, criterios: CriteriosConsultaDoacao): Promise<DoacaoProdutoRegistro[]> {
    const condicoes: string[] = [];
    const parametros: unknown[] = [];

    const doadorId = criterios.doadorId;
    if (doadorId !== null) {
      parametros.push(doadorId);
      condicoes.push(`d.doador_id = $${parametros.length}`);
    }
    if (criterios.somenteAnonimos) condicoes.push('doa.anonimo = true');
    const de = criterios.dataInicialIso;
    if (de !== null) {
      parametros.push(de);
      condicoes.push(`d.data_recebimento::date >= $${parametros.length}::date`);
    }
    const ate = criterios.dataFinalIso;
    if (ate !== null) {
      parametros.push(ate);
      condicoes.push(`d.data_recebimento::date <= $${parametros.length}::date`);
    }
    const where = condicoes.length > 0 ? `WHERE ${condicoes.join(' AND ')}` : '';

    const resultado = await executor.query<LinhaConsulta>(
      `SELECT d.id, d.doador_id, doa.nome AS doador,
              to_char(d.data_recebimento, 'YYYY-MM-DD') AS data,
              i.produto_id, p.nome AS produto, i.quantidade,
              to_char(i.data_validade, 'YYYY-MM-DD') AS data_validade
         FROM doacao_produto d
         JOIN doador doa ON doa.id = d.doador_id
         JOIN item_doacao i ON i.doacao_produto_id = d.id
         JOIN produto p ON p.id = i.produto_id
         ${where}
        ORDER BY d.data_recebimento DESC, d.id DESC, i.id`,
      parametros
    );

    // junta as linhas (uma por item) em uma doação com a lista de itens
    const porId = new Map<number, DoacaoProdutoRegistro>();
    for (const l of resultado.rows) {
      let doacao = porId.get(l.id);
      if (!doacao) {
        doacao = { id: l.id, doadorId: l.doador_id, doador: l.doador, data: l.data, itens: [] };
        porId.set(l.id, doacao);
      }
      doacao.itens.push({
        produtoId: l.produto_id,
        produto: l.produto,
        quantidade: l.quantidade,
        dataValidade: l.data_validade,
      });
    }
    return [...porId.values()];
  }
}
