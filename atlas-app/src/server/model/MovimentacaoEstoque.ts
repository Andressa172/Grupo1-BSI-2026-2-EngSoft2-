// Model - MovimentacaoEstoque (RF_F1 - Atualizar estoque)
// Uma entrada ou saída de um produto. Valida os próprios atributos e aplica a movimentação
// criando o DAO com a conexão que recebe (dentro da transação de quem chamou).
//
// RF_F1 é uma função oculta (ERS 2.2): o ator é o Sistema, sem tela própria. Quem aciona são os
// casos de uso solicitantes (doação de produto, compras, cardápio, eventos), pelos atalhos
// registrarEntrada / registrarSaida, sempre dentro da transação deles.
import type { ErrosDeCampo } from '../erros';
import { ErroValidacao } from '../erros';
import type { ExecutorSQL } from '../dao/tipos';
import { MovimentacaoEstoqueDAO, type MovimentacaoEstoqueRegistro } from '../dao/MovimentacaoEstoqueDAO';
import type { FiltroMovimentacao } from './FiltroMovimentacao';
import { dataValida, paraIso, parseData, textoSeguro } from './datasBR';

export type TipoMovimentacao = 'ENTRADA' | 'SAIDA';
// fluxo básico (APLICADA) e fluxos alternativos 2.1 e 3.1 do caso de uso
export type ResultadoMovimentacao = 'APLICADA' | 'PRODUTO_INEXISTENTE' | 'SALDO_INSUFICIENTE';

export interface MovimentacaoEstoqueAtributos {
  produtoId: unknown;
  tipo: unknown;
  quantidade: unknown;
  origem: unknown;
  dataValidade?: Date | string | null; // Date ou dd/mm/aaaa; só para entrada
}

const ID_MAXIMO = 2_147_483_647;
const QUANTIDADE_MAXIMA = 1_000_000;
const TAMANHO_MAXIMO_ORIGEM = 255;

function paraNumero(valor: unknown): number {
  if (typeof valor === 'number') return valor;
  if (typeof valor === 'string' && valor.trim() !== '') return Number(valor.trim());
  return NaN;
}

export class MovimentacaoEstoque {
  private id?: number;
  private readonly produtoId: number;
  private readonly tipo: string;
  private readonly quantidade: number;
  private readonly origem: string;
  private readonly dataValidade: Date | null;

  constructor(atributos: MovimentacaoEstoqueAtributos) {
    this.produtoId = paraNumero(atributos.produtoId);
    this.tipo = textoSeguro(atributos.tipo).toUpperCase();
    this.quantidade = paraNumero(atributos.quantidade);
    this.origem = textoSeguro(atributos.origem);
    const validade = atributos.dataValidade;
    if (validade instanceof Date) this.dataValidade = validade;
    else if (textoSeguro(validade) === '') this.dataValidade = null;
    else this.dataValidade = parseData(validade);
  }

  getId(): number | undefined {
    return this.id;
  }

  getProdutoId(): number {
    return this.produtoId;
  }

  validar(): ErrosDeCampo {
    const erros: ErrosDeCampo = {};

    if (!Number.isInteger(this.produtoId) || this.produtoId <= 0 || this.produtoId > ID_MAXIMO) {
      erros.produtoId = 'Produto inválido.';
    }
    if (this.tipo !== 'ENTRADA' && this.tipo !== 'SAIDA') {
      erros.tipo = 'Tipo inválido: use entrada ou saída.';
    }
    if (!Number.isInteger(this.quantidade) || this.quantidade <= 0) {
      erros.quantidade = 'Quantidade inválida: informe um número inteiro maior que zero.';
    } else if (this.quantidade > QUANTIDADE_MAXIMA) {
      erros.quantidade = `Quantidade inválida: o máximo é ${QUANTIDADE_MAXIMA.toLocaleString('pt-BR')}.`;
    }
    if (this.origem === '' || this.origem.length > TAMANHO_MAXIMO_ORIGEM) {
      erros.origem = 'Origem da movimentação inválida.';
    }
    if (this.dataValidade !== null) {
      if (this.tipo === 'SAIDA') erros.dataValidade = 'A validade só é informada na entrada.';
      else if (!dataValida(this.dataValidade)) erros.dataValidade = 'Data de validade inválida: use o formato dd/mm/aaaa.';
    }
    return erros;
  }

  // ------------------------------ persistência ------------------------------

  /**
   * Passos 2 a 6 do fluxo básico: verifica o produto, soma ou subtrai, atualiza o estoque e
   * registra o histórico. Chamar dentro de uma transação: se o solicitante desistir por causa
   * do resultado (ou o banco falhar), o rollback desfaz tudo (fluxo alternativo 4.1).
   */
  async aplicar(conexao: ExecutorSQL): Promise<ResultadoMovimentacao> {
    const erros = this.validar();
    if (Object.keys(erros).length > 0) throw new ErroValidacao('Movimentação de estoque inválida.', erros);

    const dao = new MovimentacaoEstoqueDAO(conexao);
    const validadeIso = this.dataValidade ? paraIso(this.dataValidade) : null;

    if (this.tipo === 'ENTRADA') {
      if (!(await dao.somarAoEstoque(this.produtoId, this.quantidade, validadeIso))) return 'PRODUTO_INEXISTENTE';
    } else if (!(await dao.subtrairDoEstoque(this.produtoId, this.quantidade))) {
      return (await dao.produtoExiste(this.produtoId)) ? 'SALDO_INSUFICIENTE' : 'PRODUTO_INEXISTENTE';
    }

    this.id = await dao.inserir(this.produtoId, this.tipo as TipoMovimentacao, this.quantidade, this.origem, validadeIso);
    return 'APLICADA';
  }

  /** Atalho para os casos de uso solicitantes. Devolve false se o produto não existe. */
  static async registrarEntrada(
    conexao: ExecutorSQL,
    produtoId: number,
    quantidade: number,
    origem: string,
    dataValidade: Date | null = null
  ): Promise<boolean> {
    const entrada = new MovimentacaoEstoque({ produtoId, tipo: 'ENTRADA', quantidade, origem, dataValidade });
    return (await entrada.aplicar(conexao)) === 'APLICADA';
  }

  /** Atalho para os casos de uso solicitantes. Devolve false se não há saldo suficiente ou o produto não existe. */
  static async registrarSaida(conexao: ExecutorSQL, produtoId: number, quantidade: number, origem: string): Promise<boolean> {
    const saida = new MovimentacaoEstoque({ produtoId, tipo: 'SAIDA', quantidade, origem });
    return (await saida.aplicar(conexao)) === 'APLICADA';
  }

  static async consultar(conexao: ExecutorSQL, filtro: FiltroMovimentacao): Promise<MovimentacaoEstoqueRegistro[]> {
    return new MovimentacaoEstoqueDAO(conexao).consultar(filtro);
  }
}
