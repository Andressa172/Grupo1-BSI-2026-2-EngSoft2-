// DAO - Cotacao (RF_F7 - Abrir cotação / RF_F8 - Aprovar cotação).
// Só executa SQL parametrizado usando o executor recebido do Model.
import type { ExecutorSQL } from './tipos';
import { Database } from '../db/Database';
import type { FiltroCotacao, StatusCotacaoValor } from '../model/FiltroCotacao';
import type { ItemCotacao } from '../model/ItemCotacao';

export interface ItemCotacaoRegistro {
  id: number;
  produtoId: number;
  produto: string;
  unidadeMedida: string;
  quantidadeDesejada: number;
}

export interface CotacaoRegistro {
  id: number;
  descricao: string;
  dataAbertura: string; // aaaa-mm-dd
  dataLimite: string | null; // aaaa-mm-dd
  dataAvaliacao: string | null; // aaaa-mm-dd
  status: StatusCotacaoValor;
  abertaPor: number | null;
  nomeAbertaPor: string | null;
  avaliadaPor: number | null;
  nomeAvaliadaPor: string | null;
  justificativa: string | null;
  itens: ItemCotacaoRegistro[];
}

export interface UsuarioResumoCotacao {
  id: number;
  nome: string;
  perfil: string;
  ativo: boolean;
}

interface LinhaConsultaCotacao {
  id: number;
  descricao: string;
  data_abertura: string;
  data_limite: string | null;
  data_avaliacao: string | null;
  status: StatusCotacaoValor;
  aberta_por: number | null;
  nome_aberta_por: string | null;
  avaliada_por: number | null;
  nome_avaliada_por: string | null;
  justificativa: string | null;
  item_id: number | null;
  produto_id: number | null;
  produto_nome: string | null;
  unidade_medida: string | null;
  quantidade_desejada: number | null;
}

const COLUNAS = `
  c.id,
  c.descricao,
  to_char(c.data_abertura, 'YYYY-MM-DD') AS data_abertura,
  to_char(c.data_limite, 'YYYY-MM-DD') AS data_limite,
  to_char(c.data_avaliacao, 'YYYY-MM-DD') AS data_avaliacao,
  c.status,
  c.aberta_por,
  u_aberta.nome AS nome_aberta_por,
  c.avaliada_por,
  u_avaliada.nome AS nome_avaliada_por,
  c.justificativa,
  i.id AS item_id,
  i.produto_id,
  p.nome AS produto_nome,
  p.unidade_medida,
  i.quantidade_desejada
`;

function agruparLinhas(linhas: LinhaConsultaCotacao[]): CotacaoRegistro[] {
  const porId = new Map<number, CotacaoRegistro>();
  for (const l of linhas) {
    let cotacao = porId.get(l.id);
    if (!cotacao) {
      cotacao = {
        id: l.id,
        descricao: l.descricao,
        dataAbertura: l.data_abertura,
        dataLimite: l.data_limite,
        dataAvaliacao: l.data_avaliacao,
        status: l.status,
        abertaPor: l.aberta_por,
        nomeAbertaPor: l.nome_aberta_por,
        avaliadaPor: l.avaliada_por,
        nomeAvaliadaPor: l.nome_avaliada_por,
        justificativa: l.justificativa,
        itens: [],
      };
      porId.set(l.id, cotacao);
    }
    if (l.item_id !== null && l.produto_id !== null && l.produto_nome !== null && l.quantidade_desejada !== null) {
      cotacao.itens.push({
        id: l.item_id,
        produtoId: l.produto_id,
        produto: l.produto_nome,
        unidadeMedida: l.unidade_medida ?? 'un',
        quantidadeDesejada: l.quantidade_desejada,
      });
    }
  }
  return [...porId.values()];
}

export class CotacaoDAO {
  constructor(private readonly executor: ExecutorSQL = Database.getInstancia()) {}

  async buscarUsuarioPorId(usuarioId: number): Promise<UsuarioResumoCotacao | null> {
    const resultado = await this.executor.query<UsuarioResumoCotacao>(
      'SELECT id, nome, perfil, ativo FROM usuario WHERE id = $1',
      [usuarioId]
    );
    return resultado.rows[0] ?? null;
  }

  async inserirCotacao(
    descricao: string,
    dataAberturaIso: string,
    dataLimiteIso: string | null,
    abertaPor: number
  ): Promise<number> {
    const resultado = await this.executor.query<{ id: number }>(
      `INSERT INTO cotacao (descricao, data_abertura, data_limite, status, aberta_por)
       VALUES ($1, $2::date, $3::date, 'PENDENTE', $4)
       RETURNING id`,
      [descricao, dataAberturaIso, dataLimiteIso, abertaPor]
    );
    return resultado.rows[0].id;
  }

  /**
   * Verifica se o produto está cadastrado (RF_F7 fluxo alternativo 3.1) e grava o item da cotação.
   * Devolve false se o produto não existir no banco.
   */
  async registrarItem(cotacaoId: number, item: ItemCotacao): Promise<boolean> {
    const produto = await this.executor.query<{ id: number }>(
      'SELECT id FROM produto WHERE id = $1',
      [item.getProdutoId()]
    );
    if ((produto.rowCount ?? 0) === 0) {
      return false;
    }

    await this.executor.query(
      'INSERT INTO item_cotacao (cotacao_id, produto_id, quantidade_desejada) VALUES ($1, $2, $3)',
      [cotacaoId, item.getProdutoId(), item.getQuantidadeDesejada()]
    );
    return true;
  }

  async atualizarAvaliacao(
    idCotacao: number,
    status: 'APROVADA' | 'REPROVADA',
    justificativa: string | null,
    avaliadaPor: number
  ): Promise<boolean> {
    const resultado = await this.executor.query<{ id: number }>(
      `UPDATE cotacao
          SET status = $1,
              justificativa = $2,
              avaliada_por = $3,
              data_avaliacao = CURRENT_DATE
        WHERE id = $4 AND status = 'PENDENTE'
      RETURNING id`,
      [status, justificativa, avaliadaPor, idCotacao]
    );
    return (resultado.rowCount ?? 0) > 0;
  }

  async buscarPorId(idCotacao: number): Promise<CotacaoRegistro | null> {
    const resultado = await this.executor.query<LinhaConsultaCotacao>(
      `SELECT ${COLUNAS}
         FROM cotacao c
         LEFT JOIN usuario u_aberta ON u_aberta.id = c.aberta_por
         LEFT JOIN usuario u_avaliada ON u_avaliada.id = c.avaliada_por
         LEFT JOIN item_cotacao i ON i.cotacao_id = c.id
         LEFT JOIN produto p ON p.id = i.produto_id
        WHERE c.id = $1
        ORDER BY i.id ASC`,
      [idCotacao]
    );
    const agrupadas = agruparLinhas(resultado.rows);
    return agrupadas[0] ?? null;
  }

  async consultar(filtro: FiltroCotacao): Promise<CotacaoRegistro[]> {
    const condicoes: string[] = [];
    const parametros: unknown[] = [];

    const id = filtro.getId();
    if (id !== null) {
      parametros.push(id);
      condicoes.push(`c.id = $${parametros.length}`);
    }

    const status = filtro.getStatus();
    if (status !== null) {
      parametros.push(status);
      condicoes.push(`c.status = $${parametros.length}`);
    }

    const descricao = filtro.getDescricao();
    if (descricao !== '') {
      parametros.push(`%${descricao}%`);
      condicoes.push(`c.descricao ILIKE $${parametros.length}`);
    }

    const dataAbertura = filtro.getDataAbertura();
    if (dataAbertura !== null) {
      parametros.push(dataAbertura);
      condicoes.push(`c.data_abertura::date = $${parametros.length}::date`);
    }

    const dataAberturaInicio = filtro.getDataAberturaInicio();
    if (dataAberturaInicio !== null) {
      parametros.push(dataAberturaInicio);
      condicoes.push(`c.data_abertura::date >= $${parametros.length}::date`);
    }

    const dataAberturaFim = filtro.getDataAberturaFim();
    if (dataAberturaFim !== null) {
      parametros.push(dataAberturaFim);
      condicoes.push(`c.data_abertura::date <= $${parametros.length}::date`);
    }

    const dataAprovacao = filtro.getDataAprovacao();
    if (dataAprovacao !== null) {
      parametros.push(dataAprovacao);
      condicoes.push(`c.data_avaliacao::date = $${parametros.length}::date`);
    }

    const dataAprovacaoInicio = filtro.getDataAprovacaoInicio();
    if (dataAprovacaoInicio !== null) {
      parametros.push(dataAprovacaoInicio);
      condicoes.push(`c.data_avaliacao::date >= $${parametros.length}::date`);
    }

    const dataAprovacaoFim = filtro.getDataAprovacaoFim();
    if (dataAprovacaoFim !== null) {
      parametros.push(dataAprovacaoFim);
      condicoes.push(`c.data_avaliacao::date <= $${parametros.length}::date`);
    }

    const produtoId = filtro.getProdutoId();
    if (produtoId !== null) {
      parametros.push(produtoId);
      condicoes.push(
        `EXISTS (SELECT 1 FROM item_cotacao ic WHERE ic.cotacao_id = c.id AND ic.produto_id = $${parametros.length})`
      );
    }

    const item = filtro.getItem();
    if (item !== '') {
      parametros.push(`%${item}%`);
      condicoes.push(
        `EXISTS (SELECT 1 FROM item_cotacao ic JOIN produto pr ON pr.id = ic.produto_id WHERE ic.cotacao_id = c.id AND pr.nome ILIKE $${parametros.length})`
      );
    }

    const where = condicoes.length > 0 ? `WHERE ${condicoes.join(' AND ')}` : '';

    const resultado = await this.executor.query<LinhaConsultaCotacao>(
      `SELECT ${COLUNAS}
         FROM cotacao c
         LEFT JOIN usuario u_aberta ON u_aberta.id = c.aberta_por
         LEFT JOIN usuario u_avaliada ON u_avaliada.id = c.avaliada_por
         LEFT JOIN item_cotacao i ON i.cotacao_id = c.id
         LEFT JOIN produto p ON p.id = i.produto_id
         ${where}
        ORDER BY c.data_abertura DESC, c.id DESC, i.id ASC`,
      parametros
    );

    return agruparLinhas(resultado.rows);
  }
}
