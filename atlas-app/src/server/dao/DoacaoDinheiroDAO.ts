// DAO - DoacaoDinheiro (RF_F11). Só executa SQL, sempre com parâmetros.
import type { ExecutorSQL } from './tipos';
import { Database } from '../db/Database';
import type { FiltroDoacao } from '../model/FiltroDoacao';

export interface DoacaoDinheiroRegistro {
  id: number;
  doadorId: number;
  doador: string;
  data: string; // aaaa-mm-dd
  valor: number;
  formaRecebimento: string;
}

interface LinhaConsulta {
  id: number;
  doador_id: number;
  doador: string;
  data: string;
  valor: number;
  forma_recebimento: string;
}

export class DoacaoDinheiroDAO {
  constructor(private readonly executor: ExecutorSQL = Database.getInstancia()) {}

  async inserir(doadorId: number, valor: number, formaRecebimento: string, dataIso: string): Promise<number> {
    const resultado = await this.executor.query<{ id: number }>(
      `INSERT INTO doacao_dinheiro (doador_id, valor, forma_recebimento, data)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [doadorId, valor, formaRecebimento, dataIso]
    );
    return resultado.rows[0].id;
  }

  /**
   * Lança a entrada no caixa aberto (RF_F6). Devolve false se não há caixa aberto
   * (a doação continua registrada, só não há caixa para receber o lançamento).
   */
  async registrarEntradaNoCaixa(doacaoId: number, valor: number): Promise<boolean> {
    const caixa = await this.executor.query<{ id: number }>(
      "SELECT id FROM caixa WHERE status = 'ABERTO' ORDER BY id DESC LIMIT 1"
    );
    if (caixa.rows.length === 0) return false;
    await this.executor.query(
      "INSERT INTO movimentacao_caixa (caixa_id, tipo, valor, origem) VALUES ($1, 'ENTRADA', $2, $3)",
      [caixa.rows[0].id, valor, `Doação em dinheiro #${doacaoId}`]
    );
    return true;
  }

  async consultar(filtro: FiltroDoacao): Promise<DoacaoDinheiroRegistro[]> {
    const condicoes: string[] = [];
    const parametros: unknown[] = [];

    const doadorId = filtro.getDoadorId();
    if (doadorId !== null) {
      parametros.push(doadorId);
      condicoes.push(`d.doador_id = $${parametros.length}`);
    }
    const de = filtro.getDataInicial();
    if (de !== null) {
      parametros.push(de);
      condicoes.push(`d.data::date >= $${parametros.length}::date`);
    }
    const ate = filtro.getDataFinal();
    if (ate !== null) {
      parametros.push(ate);
      condicoes.push(`d.data::date <= $${parametros.length}::date`);
    }
    const where = condicoes.length > 0 ? `WHERE ${condicoes.join(' AND ')}` : '';

    const resultado = await this.executor.query<LinhaConsulta>(
      `SELECT d.id, d.doador_id, doa.nome AS doador, to_char(d.data, 'YYYY-MM-DD') AS data,
              d.valor::float8 AS valor, d.forma_recebimento
         FROM doacao_dinheiro d
         JOIN doador doa ON doa.id = d.doador_id
         ${where}
        ORDER BY d.data DESC, d.id DESC`,
      parametros
    );
    return resultado.rows.map((l) => ({
      id: l.id,
      doadorId: l.doador_id,
      doador: l.doador,
      data: l.data,
      valor: l.valor,
      formaRecebimento: l.forma_recebimento,
    }));
  }
}
