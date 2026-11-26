// DAO - DoacaoDinheiro (RF_F11). Só executa SQL, sempre com parâmetros.
import type { ExecutorSQL } from './tipos';

// critérios da consulta, já prontos: o Model monta a partir do filtro e entrega ao DAO
export interface CriteriosConsultaDoacao {
  doadorId: number | null;
  somenteAnonimos: boolean;
  dataInicialIso: string | null;
  dataFinalIso: string | null;
}

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
  // "conexao: ExecutorSQL" - ExecutorSQL é só o NOME de um tipo (poderia se chamar Conexao; o nome é estético).
  // Ele está definido em dao/tipos.ts e diz: "qualquer objeto que tenha o método query(sql, parametros)".
  // Serve para o DAO não saber de onde vem a conexão: pode ser o pool normal ou o client de uma transação
  // em aberto, e o DAO não cria nem guarda nada, só executa o SQL na conexão que o Controller abriu.
  async inserir(conexao: ExecutorSQL, doadorId: number, valor: number, formaRecebimento: string, dataIso: string): Promise<number> {
    const resultado = await conexao.query<{ id: number }>(
      `INSERT INTO doacao_dinheiro (doador_id, valor, forma_recebimento, data)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [doadorId, valor, formaRecebimento, dataIso]
    );
    return resultado.rows[0].id;
  }

  // "conexao: ExecutorSQL" - ExecutorSQL é só o NOME de um tipo (poderia se chamar Conexao; o nome é estético).
  // Ele está definido em dao/tipos.ts e diz: "qualquer objeto que tenha o método query(sql, parametros)".
  // Serve para o DAO não saber de onde vem a conexão: pode ser o pool normal ou o client de uma transação
  // em aberto, e o DAO não cria nem guarda nada, só executa o SQL na conexão que o Controller abriu.
  async consultar(conexao: ExecutorSQL, criterios: CriteriosConsultaDoacao): Promise<DoacaoDinheiroRegistro[]> {
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
      condicoes.push(`d.data::date >= $${parametros.length}::date`);
    }
    const ate = criterios.dataFinalIso;
    if (ate !== null) {
      parametros.push(ate);
      condicoes.push(`d.data::date <= $${parametros.length}::date`);
    }
    const where = condicoes.length > 0 ? `WHERE ${condicoes.join(' AND ')}` : '';

    const resultado = await conexao.query<LinhaConsulta>(
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
