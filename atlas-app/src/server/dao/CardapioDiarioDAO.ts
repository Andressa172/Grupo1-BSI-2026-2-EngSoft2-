// DAO - CardapioDiario (RF_F10)
import type { ExecutorSQL } from './tipos';
import { Database } from '../db/Database';
import { CardapioDiario, type TipoRefeicao } from '../model/CardapioDiario';
import { paraDataSimples } from './datas';

interface CardapioDiarioLinha {
  id: number;
  data: string | Date;
  tipo_refeicao: TipoRefeicao;
  criado_por: number | null;
}

function linhaParaCardapio(linha: CardapioDiarioLinha): CardapioDiario {
  return new CardapioDiario({
    id: linha.id,
    data: paraDataSimples(linha.data),
    tipoRefeicao: linha.tipo_refeicao,
    criadoPor: linha.criado_por,
  });
}

export class CardapioDiarioDAO {
  constructor(private readonly executor: ExecutorSQL = Database.getInstancia()) {}

  async listarTodos(): Promise<CardapioDiario[]> {
    const resultado = await this.executor.query<CardapioDiarioLinha>(
      'SELECT id, data, tipo_refeicao, criado_por FROM cardapio_diario ORDER BY data DESC, id DESC'
    );
    return resultado.rows.map(linhaParaCardapio);
  }

  async buscarPorId(id: number): Promise<CardapioDiario | null> {
    const resultado = await this.executor.query<CardapioDiarioLinha>(
      'SELECT id, data, tipo_refeicao, criado_por FROM cardapio_diario WHERE id = $1',
      [id]
    );
    return resultado.rows[0] ? linhaParaCardapio(resultado.rows[0]) : null;
  }

  async existeParaDataETipo(data: string, tipoRefeicao: TipoRefeicao): Promise<boolean> {
    const resultado = await this.executor.query(
      'SELECT id FROM cardapio_diario WHERE data = $1 AND tipo_refeicao = $2',
      [data, tipoRefeicao]
    );
    return resultado.rows.length > 0;
  }

  async inserir(cardapio: CardapioDiario): Promise<CardapioDiario> {
    const dados = cardapio.paraLinhaDeDados();
    const resultado = await this.executor.query<CardapioDiarioLinha>(
      `INSERT INTO cardapio_diario (data, tipo_refeicao, criado_por)
       VALUES ($1, $2, $3)
       RETURNING id, data, tipo_refeicao, criado_por`,
      [dados.data, dados.tipoRefeicao, dados.criadoPor]
    );
    return linhaParaCardapio(resultado.rows[0]);
  }
}
