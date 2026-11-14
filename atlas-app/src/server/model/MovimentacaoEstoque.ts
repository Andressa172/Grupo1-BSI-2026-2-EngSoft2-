// Model - MovimentacaoEstoque (RF_F1 - Atualizar estoque) - "MovEstoque" no diagrama de classes
// Uma entrada ou saída de um produto. Valida os próprios atributos e grava o histórico
// criando o DAO com a conexão que recebe (dentro da transação de quem chamou).
//
// RF_F1 é uma função oculta (ERS 2.2): o ator é o Sistema, sem tela própria. Quem aciona são os
// Controllers dos casos de uso solicitantes, chamando AtualizarEstoqueController.atualizarEstoque,
// que executa o fluxo básico. O Model nunca chama um Controller (fluxo C -> M -> DAO).
import type { ErrosDeCampo } from '../erros';
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

  getQuantidade(): number {
    return this.quantidade;
  }

  getTipo(): TipoMovimentacao {
    return this.tipo as TipoMovimentacao;
  }

  // aaaa-mm-dd, ou null se a entrada veio sem validade
  getDataValidadeIso(): string | null {
    return this.dataValidade ? paraIso(this.dataValidade) : null;
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

  /** RF_F1, passo 5 (1.4 no diagrama de sequência): registra o histórico com data, quantidade e tipo. */
  async registrar(conexao: ExecutorSQL): Promise<void> {
    this.id = await new MovimentacaoEstoqueDAO(conexao).inserir(
      this.produtoId,
      this.getTipo(),
      this.quantidade,
      this.origem,
      this.getDataValidadeIso()
    );
  }

  static async consultar(conexao: ExecutorSQL, filtro: FiltroMovimentacao): Promise<MovimentacaoEstoqueRegistro[]> {
    return new MovimentacaoEstoqueDAO(conexao).consultar(filtro);
  }
}
