// DAO - Caixa e MovimentacaoCaixa (RF_F4, RF_F5, RF_F6)
import { Database } from '../db/Database';
import { Caixa, type StatusCaixa } from '../model/Caixa';
import {
  MovimentacaoCaixa,
  type FormaPagamentoCaixa,
  type TipoMovimentacaoCaixa,
} from '../model/MovimentacaoCaixa';
import type { ExecutorSQL } from './tipos';

interface CaixaLinha {
  id: number;
  data_abertura: Date | string;
  data_fechamento: Date | string | null;
  saldo_fisico_abertura: number;
  saldo_digital_abertura: number;
  saldo_fisico_fechamento: number | null;
  saldo_digital_fechamento: number | null;
  status: StatusCaixa;
  aberto_por: number | null;
}

interface MovimentacaoCaixaLinha {
  id: number;
  caixa_id: number;
  tipo: TipoMovimentacaoCaixa;
  forma_pag: FormaPagamentoCaixa;
  valor: number;
  origem: string;
  data: Date | string;
}

function paraIso(valor: Date | string | null | undefined): string | undefined {
  if (!valor) return undefined;
  return valor instanceof Date ? valor.toISOString() : String(valor);
}

function linhaParaCaixa(linha: CaixaLinha): Caixa {
  return new Caixa({
    id: linha.id,
    dataAbertura: paraIso(linha.data_abertura),
    dataFechamento: paraIso(linha.data_fechamento) ?? null,
    saldoFisicoAbertura: Number(linha.saldo_fisico_abertura),
    saldoDigitalAbertura: Number(linha.saldo_digital_abertura),
    saldoFisicoFechamento:
      linha.saldo_fisico_fechamento !== null && linha.saldo_fisico_fechamento !== undefined
        ? Number(linha.saldo_fisico_fechamento)
        : null,
    saldoDigitalFechamento:
      linha.saldo_digital_fechamento !== null && linha.saldo_digital_fechamento !== undefined
        ? Number(linha.saldo_digital_fechamento)
        : null,
    status: linha.status,
    abertoPor: linha.aberto_por ?? 0,
  });
}

function linhaParaMovimentacao(linha: MovimentacaoCaixaLinha): MovimentacaoCaixa {
  return new MovimentacaoCaixa({
    id: linha.id,
    caixaId: linha.caixa_id,
    tipo: linha.tipo,
    formaPag: linha.forma_pag ?? 'FISICO',
    valor: Number(linha.valor),
    origem: linha.origem,
    data: paraIso(linha.data),
  });
}

const COLUNAS_CAIXA = `id,
  to_char(data_abertura, 'YYYY-MM-DD"T"HH24:MI:SS"-03:00"') AS data_abertura,
  to_char(data_fechamento, 'YYYY-MM-DD"T"HH24:MI:SS"-03:00"') AS data_fechamento,
  saldo_fisico_abertura::float8 AS saldo_fisico_abertura,
  saldo_digital_abertura::float8 AS saldo_digital_abertura,
  saldo_fisico_fechamento::float8 AS saldo_fisico_fechamento,
  saldo_digital_fechamento::float8 AS saldo_digital_fechamento,
  status, aberto_por`;

export class CaixaDAO {
  constructor(private readonly executor: ExecutorSQL = Database.getInstancia()) {}

  async buscarCaixaAberto(paraAtualizacao = false): Promise<Caixa | null> {
    const lock = paraAtualizacao ? ' FOR UPDATE' : '';
    const resultado = await this.executor.query<CaixaLinha>(
      `SELECT ${COLUNAS_CAIXA}
       FROM caixa
       WHERE status = 'ABERTO'
       ORDER BY id DESC
       LIMIT 1${lock}`
    );
    return resultado.rows[0] ? linhaParaCaixa(resultado.rows[0]) : null;
  }

  async listarTodos(): Promise<Caixa[]> {
    const resultado = await this.executor.query<CaixaLinha>(
      `SELECT ${COLUNAS_CAIXA}
       FROM caixa
       ORDER BY id DESC`
    );
    return resultado.rows.map(linhaParaCaixa);
  }

  async inserir(caixa: Caixa): Promise<Caixa> {
    const dados = caixa.paraLinhaDeDados();
    const resultado = await this.executor.query<CaixaLinha>(
      `INSERT INTO caixa (data_abertura, saldo_fisico_abertura, saldo_digital_abertura, status, aberto_por)
       VALUES (now() AT TIME ZONE 'America/Sao_Paulo', $1, $2, 'ABERTO', $3)
       RETURNING ${COLUNAS_CAIXA}`,
      [dados.saldoFisicoAbertura, dados.saldoDigitalAbertura, dados.abertoPor]
    );
    return linhaParaCaixa(resultado.rows[0]);
  }

  async fechar(id: number, saldoFisicoFinal: number, saldoDigitalFinal: number): Promise<Caixa | null> {
    const resultado = await this.executor.query<CaixaLinha>(
      `UPDATE caixa
       SET saldo_fisico_fechamento = $2,
           saldo_digital_fechamento = $3,
           data_fechamento = (now() AT TIME ZONE 'America/Sao_Paulo'),
           status = 'FECHADO'
       WHERE id = $1 AND status = 'ABERTO'
       RETURNING ${COLUNAS_CAIXA}`,
      [id, saldoFisicoFinal, saldoDigitalFinal]
    );
    return resultado.rows[0] ? linhaParaCaixa(resultado.rows[0]) : null;
  }

  async inserirMovimentacao(movimentacao: MovimentacaoCaixa): Promise<MovimentacaoCaixa> {
    const dados = movimentacao.paraLinhaDeDados();
    const resultado = await this.executor.query<MovimentacaoCaixaLinha>(
      `INSERT INTO movimentacao_caixa (caixa_id, tipo, forma_pag, valor, origem, data)
       VALUES ($1, $2, $3, $4, $5, now() AT TIME ZONE 'America/Sao_Paulo')
       RETURNING id, caixa_id, tipo, forma_pag, valor::float8 AS valor, origem,
                 to_char(data, 'YYYY-MM-DD"T"HH24:MI:SS"-03:00"') AS data`,
      [dados.caixaId, dados.tipo, dados.formaPag, dados.valor, dados.origem]
    );
    return linhaParaMovimentacao(resultado.rows[0]);
  }

  async listarMovimentacoesPorCaixa(caixaId: number): Promise<MovimentacaoCaixa[]> {
    const resultado = await this.executor.query<MovimentacaoCaixaLinha>(
      `SELECT id, caixa_id, tipo, forma_pag, valor::float8 AS valor, origem,
              to_char(data, 'YYYY-MM-DD"T"HH24:MI:SS"-03:00"') AS data
       FROM movimentacao_caixa
       WHERE caixa_id = $1
       ORDER BY data DESC, id DESC`,
      [caixaId]
    );
    return resultado.rows.map(linhaParaMovimentacao);
  }
}
