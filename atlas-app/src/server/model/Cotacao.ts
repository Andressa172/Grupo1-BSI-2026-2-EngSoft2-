// Model - Cotacao (RF_F7 - Abrir cotação / RF_F8 - Aprovar cotação).
// Mantém seus atributos e a lista de ItemCotacao, valida seus próprios dados
// e instancia o CotacaoDAO repassando a conexão recebida do Controller.
import type { ErrosDeCampo } from '../erros';
import type { ExecutorSQL } from '../dao/tipos';
import {
  CotacaoDAO,
  type CotacaoRegistro,
  type ItemCotacaoRegistro,
  type UsuarioResumoCotacao,
} from '../dao/CotacaoDAO';
import type { FiltroCotacao, StatusCotacaoValor } from './FiltroCotacao';
import { ItemCotacao } from './ItemCotacao';
import { dataValida, paraIso, parseData, textoSeguro } from './datasBR';

export type { CotacaoRegistro, ItemCotacaoRegistro, UsuarioResumoCotacao };

const ID_MAXIMO = 2_147_483_647;
const DESCRICAO_MAXIMA = 255;
const JUSTIFICATIVA_MAXIMA = 500;
const STATUS_AVALIACAO = ['APROVADA', 'REPROVADA'] as const;

function parseIdPositivo(valor: unknown): number {
  if (typeof valor === 'number') {
    return Number.isInteger(valor) ? valor : NaN;
  }
  if (typeof valor === 'string' && valor.trim() !== '' && /^\d{1,10}$/.test(valor.trim())) {
    return Number(valor.trim());
  }
  return NaN;
}

export class Cotacao {
  private id?: number;
  private descricao: string;
  private textoDataAbertura: string;
  private dataAbertura: Date;
  private textoDataLimite: string;
  private dataLimite: Date | null;
  private status: string;
  private abertaPor: number;
  private avaliadaPor: number;
  private justificativa: string | null;
  private itens: ItemCotacao[];
  private itensRecebidosComoLista: boolean;

  constructor(dados: unknown, itensInstanciados?: ItemCotacao[]) {
    const d = typeof dados === 'object' && dados !== null ? (dados as Record<string, unknown>) : {};
    this.id = Number.isInteger(d.id) ? (d.id as number) : undefined;
    this.descricao = textoSeguro(d.descricao);

    this.textoDataAbertura = textoSeguro(d.dataAbertura);
    this.dataAbertura = parseData(this.textoDataAbertura);

    this.textoDataLimite = textoSeguro(d.dataLimite);
    this.dataLimite = this.textoDataLimite === '' ? null : parseData(this.textoDataLimite);

    this.status = textoSeguro(d.status).toUpperCase();
    this.abertaPor = parseIdPositivo(d.abertaPor);
    this.avaliadaPor = parseIdPositivo(d.avaliadaPor);

    const textoJustificativa = textoSeguro(d.justificativa);
    this.justificativa = textoJustificativa === '' ? null : textoJustificativa;

    if (Array.isArray(itensInstanciados)) {
      this.itensRecebidosComoLista = true;
      this.itens = [...itensInstanciados];
    } else {
      this.itensRecebidosComoLista = Array.isArray(d.itens);
      this.itens = this.itensRecebidosComoLista
        ? (d.itens as unknown[]).map((i) => (i instanceof ItemCotacao ? i : new ItemCotacao(i)))
        : [];
    }
  }

  // ------------------------------- get / set -------------------------------

  getId(): number | undefined {
    return this.id;
  }

  setId(id: number): void {
    this.id = id;
  }

  getDescricao(): string {
    return this.descricao;
  }

  setDescricao(descricao: string): void {
    this.descricao = textoSeguro(descricao);
  }

  getDataAbertura(): Date {
    return this.dataAbertura;
  }

  getDataLimite(): Date | null {
    return this.dataLimite;
  }

  getStatus(): string {
    return this.status;
  }

  setStatus(status: string): void {
    this.status = textoSeguro(status).toUpperCase();
  }

  getAbertaPor(): number {
    return this.abertaPor;
  }

  getAvaliadaPor(): number {
    return this.avaliadaPor;
  }

  getJustificativa(): string | null {
    return this.justificativa;
  }

  setJustificativa(justificativa: string | null): void {
    const t = textoSeguro(justificativa);
    this.justificativa = t === '' ? null : t;
  }

  getItens(): ItemCotacao[] {
    return this.itens;
  }

  setItens(itens: ItemCotacao[]): void {
    this.itensRecebidosComoLista = true;
    this.itens = [...itens];
  }

  adicionarItem(item: ItemCotacao): void {
    this.itensRecebidosComoLista = true;
    this.itens.push(item);
  }

  // ------------------------------- validação -------------------------------

  /**
   * RF_F7 (Abrir cotação): valida descrição, data de abertura, data limite (se informada),
   * secretário responsável e a lista de itens (produtos distintos e quantidades > 0).
   */
  validarAbertura(): ErrosDeCampo {
    const erros: ErrosDeCampo = {};

    if (this.descricao.length === 0) {
      erros.descricao = 'Descrição não preenchida: informe a descrição da cotação.';
    } else if (this.descricao.length > DESCRICAO_MAXIMA) {
      erros.descricao = `A descrição deve ter no máximo ${DESCRICAO_MAXIMA} caracteres.`;
    }

    if (this.textoDataAbertura === '') {
      erros.dataAbertura = 'A data de abertura é obrigatória.';
    } else if (!dataValida(this.dataAbertura)) {
      erros.dataAbertura = 'Data de abertura inválida: use o formato dd/mm/aaaa ou aaaa-mm-dd.';
    }

    if (this.textoDataLimite !== '') {
      if (this.dataLimite === null || !dataValida(this.dataLimite)) {
        erros.dataLimite = 'Data limite inválida: use o formato dd/mm/aaaa ou aaaa-mm-dd.';
      } else if (dataValida(this.dataAbertura) && this.dataLimite.getTime() < this.dataAbertura.getTime()) {
        erros.dataLimite = 'A data limite não pode ser anterior à data de abertura.';
      }
    }

    if (!Number.isInteger(this.abertaPor) || this.abertaPor <= 0 || this.abertaPor > ID_MAXIMO) {
      erros.abertaPor = 'Informe o secretário responsável pela abertura da cotação.';
    }

    if (!this.itensRecebidosComoLista || this.itens.length === 0) {
      erros.itens = 'Adicione pelo menos um item à cotação.';
    } else {
      const produtosVistos = new Set<number>();
      this.itens.forEach((item, indice) => {
        const errosItem = item.validar();
        for (const [campo, mensagem] of Object.entries(errosItem)) {
          erros[`itens.${indice}.${campo}`] = mensagem;
        }
        const pid = item.getProdutoId();
        if (!errosItem.produto) {
          if (produtosVistos.has(pid)) {
            erros[`itens.${indice}.produto`] = 'Este produto já foi adicionado na cotação.';
          } else {
            produtosVistos.add(pid);
          }
        }
      });
    }

    return erros;
  }

  /** Alias compatível com a nomenclatura do diagrama de sequência/classes da ERS (validarDados). */
  validarDados(): ErrosDeCampo {
    return this.validarAbertura();
  }

  /**
   * RF_F8 (Aprovar cotação): valida status (APROVADA ou REPROVADA), gerente aprovador
   * e justificativa (obrigatória ao reprovar e opcional ao aprovar).
   */
  validarAvaliacao(): ErrosDeCampo {
    const erros: ErrosDeCampo = {};

    if (!STATUS_AVALIACAO.includes(this.status as (typeof STATUS_AVALIACAO)[number])) {
      erros.status = 'Status inválido: selecione APROVADA ou REPROVADA.';
    }

    if (!Number.isInteger(this.avaliadaPor) || this.avaliadaPor <= 0 || this.avaliadaPor > ID_MAXIMO) {
      erros.avaliadaPor = 'Informe o gerente responsável pela avaliação da cotação.';
    }

    if (this.status === 'REPROVADA' && (!this.justificativa || this.justificativa.trim().length === 0)) {
      erros.justificativa = 'A justificativa é obrigatória ao reprovar uma cotação.';
    } else if (this.justificativa && this.justificativa.length > JUSTIFICATIVA_MAXIMA) {
      erros.justificativa = `A justificativa deve ter no máximo ${JUSTIFICATIVA_MAXIMA} caracteres.`;
    }

    return erros;
  }

  // ----------------------------- persistência ------------------------------

  async buscarUsuarioResponsavel(conexao: ExecutorSQL): Promise<UsuarioResumoCotacao | null> {
    return new CotacaoDAO(conexao).buscarUsuarioPorId(this.abertaPor);
  }

  async buscarGerenteAvaliador(conexao: ExecutorSQL): Promise<UsuarioResumoCotacao | null> {
    return new CotacaoDAO(conexao).buscarUsuarioPorId(this.avaliadaPor);
  }

  /**
   * RF_F7: grava o cabeçalho da cotação no banco criando o CotacaoDAO com a conexão recebida do Controller.
   */
  async inserirCabecalho(conexao: ExecutorSQL): Promise<number> {
    const dao = new CotacaoDAO(conexao);
    const dataAberturaIso = paraIso(this.dataAbertura);
    const dataLimiteIso = this.dataLimite ? paraIso(this.dataLimite) : null;

    const idGerado = await dao.inserirCotacao(
      this.descricao,
      dataAberturaIso,
      dataLimiteIso,
      this.abertaPor
    );
    this.id = idGerado;
    return idGerado;
  }

  /**
   * RF_F8: atualiza o status, justificativa e gerente aprovador no banco criando o CotacaoDAO.
   */
  async atualizarAvaliacao(idCotacao: number, conexao: ExecutorSQL): Promise<boolean> {
    const dao = new CotacaoDAO(conexao);
    const statusAvaliado = this.status as Extract<StatusCotacaoValor, 'APROVADA' | 'REPROVADA'>;
    return dao.atualizarAvaliacao(idCotacao, statusAvaliado, this.justificativa, this.avaliadaPor);
  }

  static async consultar(filtro: FiltroCotacao, conexao: ExecutorSQL): Promise<CotacaoRegistro[]> {
    return new CotacaoDAO(conexao).consultar(filtro);
  }

  static async buscarPorId(idCotacao: number, conexao: ExecutorSQL): Promise<CotacaoRegistro | null> {
    return new CotacaoDAO(conexao).buscarPorId(idCotacao);
  }
}
