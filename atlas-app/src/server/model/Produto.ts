// Model - Produto (RF_B3)
// Guarda os dados do produto, valida os próprios atributos e faz a persistência
// criando o ProdutoDAO com a conexão que recebe do Controller.
import type { ErrosDeCampo } from '../erros';
import type { ExecutorSQL } from '../dao/tipos';
import { ProdutoDAO, type ProdutoLinha } from '../dao/ProdutoDAO';
import type { FiltroProduto } from './FiltroProduto';

export const CATEGORIAS_PRODUTO = ['Alimento', 'Material', 'Higiene', 'Outro'] as const;

export interface ProdutoAtributos {
  id?: number;
  nome: string;
  categoria: string;
  unidadeMedida: string;
  numeroLote?: string | null;
  quantidadeEstoque?: number;
  // vem como texto do formulário ou número do banco
  estoqueMinimo?: number | string;
  dataValidade?: string | null;
}

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

// data de hoje no formato aaaa-mm-dd (horário local)
export function hojeISO(): string {
  const agora = new Date();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  return `${agora.getFullYear()}-${mes}-${dia}`;
}

function dataIsoValida(texto: string): boolean {
  if (!DATA_ISO.test(texto)) return false;
  const [ano, mes, dia] = texto.split('-').map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  return data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia;
}

// '' ou só espaços vira NaN, para cair na validação de obrigatório
function paraNumero(valor: number | string | undefined): number {
  if (valor === undefined) return 0;
  if (typeof valor === 'string' && valor.trim() === '') return NaN;
  return Number(valor);
}

export class Produto {
  private id?: number;
  private nome: string;
  private categoria: string;
  private unidadeMedida: string;
  private numeroLote: string;
  private quantidadeEstoque: number;
  private estoqueMinimo: number;
  private dataValidade: string | null;

  constructor(atributos: ProdutoAtributos) {
    this.id = atributos.id;
    this.nome = atributos.nome?.trim() ?? '';
    this.categoria = atributos.categoria?.trim() ?? '';
    this.unidadeMedida = atributos.unidadeMedida?.trim() ?? '';
    this.numeroLote = atributos.numeroLote?.trim() ?? '';
    this.quantidadeEstoque = atributos.quantidadeEstoque ?? 0;
    this.estoqueMinimo = paraNumero(atributos.estoqueMinimo);
    this.dataValidade = atributos.dataValidade?.trim() || null;
  }

  // ------------------------------- get / set -------------------------------

  getId(): number | undefined {
    return this.id;
  }

  setId(id: number): void {
    this.id = id;
  }

  getNome(): string {
    return this.nome;
  }

  setNome(nome: string): void {
    this.nome = nome?.trim() ?? '';
  }

  getCategoria(): string {
    return this.categoria;
  }

  setCategoria(categoria: string): void {
    this.categoria = categoria?.trim() ?? '';
  }

  getUnidadeMedida(): string {
    return this.unidadeMedida;
  }

  setUnidadeMedida(unidadeMedida: string): void {
    this.unidadeMedida = unidadeMedida?.trim() ?? '';
  }

  getNumeroLote(): string {
    return this.numeroLote;
  }

  setNumeroLote(numeroLote: string): void {
    this.numeroLote = numeroLote?.trim() ?? '';
  }

  // a quantidade em estoque não tem setter: ela só muda por movimentação (RF_F1)
  getQuantidadeEstoque(): number {
    return this.quantidadeEstoque;
  }

  // RF_F1, passo 1.2 do diagrama de sequência: qtdAtual = getQuantidade()
  getQuantidade(): number {
    return this.quantidadeEstoque;
  }

  /**
   * RF_F1, passo 3 (1.3 no diagrama de sequência): calcula a nova quantidade, somando na entrada
   * ou subtraindo na saída. Devolve false se a saída for maior que o estoque (fluxo alternativo 3.1).
   * Validade: numa entrada com validade, fica a mais próxima; uma saída que zera o estoque limpa
   * a validade (não sobrou nada que possa vencer).
   */
  atualizQuantidade(quantidade: number, tipoMov: 'ENTRADA' | 'SAIDA', validadeDaEntrada: string | null = null): boolean {
    if (tipoMov === 'SAIDA') {
      if (quantidade > this.quantidadeEstoque) return false;
      this.quantidadeEstoque -= quantidade;
      if (this.quantidadeEstoque === 0) this.dataValidade = null;
      return true;
    }

    if (
      validadeDaEntrada !== null &&
      (this.quantidadeEstoque === 0 || this.dataValidade === null || validadeDaEntrada < this.dataValidade)
    ) {
      this.dataValidade = validadeDaEntrada;
    }
    this.quantidadeEstoque += quantidade;
    return true;
  }

  getEstoqueMinimo(): number {
    return this.estoqueMinimo;
  }

  setEstoqueMinimo(estoqueMinimo: number | string): void {
    this.estoqueMinimo = paraNumero(estoqueMinimo);
  }

  getDataValidade(): string | null {
    return this.dataValidade;
  }

  setDataValidade(dataValidade: string | null): void {
    this.dataValidade = dataValidade?.trim() || null;
  }

  // ------------------------------- validação -------------------------------

  /**
   * Valida os atributos do produto. Devolve um mapa campo -> mensagem com TODOS
   * os erros encontrados (mapa vazio = produto válido).
   *
   * `validadeJaGravada`: na alteração, a validade que já estava no banco. Se ela
   * não foi mudada, um produto que venceu depois do cadastro ainda pode ser editado.
   */
  validar(validadeJaGravada?: string | null): ErrosDeCampo {
    const erros: ErrosDeCampo = {};

    if (this.nome.length === 0) {
      erros.nome = 'O nome do produto é obrigatório.';
    } else if (this.nome.length > 120) {
      erros.nome = 'O nome do produto deve ter no máximo 120 caracteres.';
    }

    if (this.categoria.length === 0) {
      erros.categoria = 'A categoria é obrigatória.';
    } else if (!(CATEGORIAS_PRODUTO as readonly string[]).includes(this.categoria)) {
      erros.categoria = 'Categoria inválida.';
    }

    if (this.unidadeMedida.length === 0) {
      erros.unidadeMedida = 'A unidade de medida é obrigatória.';
    } else if (this.unidadeMedida.length > 30) {
      erros.unidadeMedida = 'A unidade de medida deve ter no máximo 30 caracteres.';
    }

    if (this.numeroLote.length === 0) {
      erros.numeroLote = 'O número do lote é obrigatório.';
    } else if (this.numeroLote.length > 30) {
      erros.numeroLote = 'O número do lote deve ter no máximo 30 caracteres.';
    } else if (!/^[A-Za-z0-9\-/.]+$/.test(this.numeroLote)) {
      erros.numeroLote = 'Use apenas letras, números, "-", "/" ou ".".';
    }

    if (!Number.isInteger(this.estoqueMinimo) || this.estoqueMinimo < 0) {
      erros.estoqueMinimo = 'Use um número inteiro, 0 ou mais.';
    }

    if (this.dataValidade !== null) {
      if (!dataIsoValida(this.dataValidade)) {
        erros.dataValidade = 'Data de validade inválida.';
      } else if (this.dataValidade < hojeISO() && this.dataValidade !== validadeJaGravada) {
        erros.dataValidade = 'A data de validade não pode ser anterior à data atual.';
      }
    }

    return erros;
  }

  // ------------------------------ persistência ------------------------------
  // O Model cria o DAO usando a conexão que o Controller abriu.

  async incluir(conexao: ExecutorSQL): Promise<void> {
    const salvo = await new ProdutoDAO(conexao).inserir(this);
    this.id = salvo.getId();
    this.quantidadeEstoque = salvo.getQuantidadeEstoque();
  }

  async alterar(conexao: ExecutorSQL): Promise<boolean> {
    const salvo = await new ProdutoDAO(conexao).atualizar(this);
    return salvo !== null;
  }

  async excluir(conexao: ExecutorSQL): Promise<boolean> {
    if (this.id === undefined) return false;
    return new ProdutoDAO(conexao).excluir(this.id);
  }

  async existeOutroComMesmoNome(conexao: ExecutorSQL): Promise<boolean> {
    return new ProdutoDAO(conexao).existeComNome(this.nome, this.id);
  }

  static async buscarPorId(conexao: ExecutorSQL, id: number): Promise<Produto | null> {
    return new ProdutoDAO(conexao).buscarPorId(id);
  }

  // RF_F1, passo 4: grava a quantidade (e a validade) calculadas em atualizQuantidade
  async salvarEstoque(conexao: ExecutorSQL): Promise<void> {
    if (this.id === undefined) return;
    await new ProdutoDAO(conexao).atualizarEstoque(this.id, this.quantidadeEstoque, this.dataValidade);
  }

  // RF_F1, passo 2: o Controller cria o Produto só com o id e o próprio Model se carrega do banco,
  // travando a linha até o fim da transação de quem chamou, para duas movimentações ao mesmo tempo
  // não calcularem em cima do mesmo saldo. Devolve false se o produto não está cadastrado.
  async carregarParaAtualizarEstoque(conexao: ExecutorSQL): Promise<boolean> {
    if (this.id === undefined) return false;
    const atual = await new ProdutoDAO(conexao).buscarPorIdParaAtualizar(this.id);
    if (!atual) return false;
    this.nome = atual.nome;
    this.categoria = atual.categoria;
    this.unidadeMedida = atual.unidadeMedida;
    this.numeroLote = atual.numeroLote;
    this.quantidadeEstoque = atual.quantidadeEstoque;
    this.estoqueMinimo = atual.estoqueMinimo;
    this.dataValidade = atual.dataValidade;
    return true;
  }

  // lista simples para as telas de cardápio (RF_F10) e eventos (RF_F9)
  static async listarTodos(conexao: ExecutorSQL): Promise<ProdutoLinha[]> {
    return new ProdutoDAO(conexao).listarTodos();
  }

  static async consultar(conexao: ExecutorSQL, filtro: FiltroProduto): Promise<Produto[]> {
    return new ProdutoDAO(conexao).consultar(filtro);
  }

  paraLinhaDeDados() {
    return {
      id: this.id,
      nome: this.nome,
      categoria: this.categoria,
      unidadeMedida: this.unidadeMedida,
      numeroLote: this.numeroLote,
      quantidadeEstoque: this.quantidadeEstoque,
      estoqueMinimo: this.estoqueMinimo,
      dataValidade: this.dataValidade,
    };
  }
}
