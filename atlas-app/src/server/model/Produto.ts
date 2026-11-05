// Model - Produto (RF_B3)
import { ErroValidacao } from '../erros';

export interface ProdutoAtributos {
  id?: number;
  nome: string;
  categoria: string;
  unidadeMedida: string;
  quantidadeEstoque?: number;
  estoqueMinimo?: number;
  dataValidade?: string | null;
}

export class Produto {
  private id?: number;
  private nome: string;
  private categoria: string;
  private unidadeMedida: string;
  private quantidadeEstoque: number;
  private estoqueMinimo: number;
  private dataValidade: string | null;

  constructor(atributos: ProdutoAtributos) {
    this.id = atributos.id;
    this.nome = atributos.nome?.trim() ?? '';
    this.categoria = atributos.categoria?.trim() ?? '';
    this.unidadeMedida = atributos.unidadeMedida?.trim() ?? '';
    this.quantidadeEstoque = atributos.quantidadeEstoque ?? 0;
    this.estoqueMinimo = Number(atributos.estoqueMinimo ?? 0);
    this.dataValidade = atributos.dataValidade || null;
  }

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

  // a quantidade em estoque não tem setter: ela só muda por movimentação (RF_F1)
  getQuantidadeEstoque(): number {
    return this.quantidadeEstoque;
  }

  getEstoqueMinimo(): number {
    return this.estoqueMinimo;
  }

  setEstoqueMinimo(estoqueMinimo: number): void {
    this.estoqueMinimo = Number(estoqueMinimo);
  }

  getDataValidade(): string | null {
    return this.dataValidade;
  }

  setDataValidade(dataValidade: string | null): void {
    this.dataValidade = dataValidade || null;
  }

  validar(): void {
    if (!this.nome || this.nome.length === 0) {
      throw new ErroValidacao('O nome do produto é obrigatório.');
    }
    if (this.nome.length > 120) {
      throw new ErroValidacao('O nome do produto deve ter no máximo 120 caracteres.');
    }
    if (!this.categoria || this.categoria.length === 0) {
      throw new ErroValidacao('A categoria é obrigatória.');
    }
    if (!this.unidadeMedida || this.unidadeMedida.length === 0) {
      throw new ErroValidacao('A unidade de medida é obrigatória.');
    }
    if (!Number.isInteger(this.estoqueMinimo) || this.estoqueMinimo < 0) {
      throw new ErroValidacao('O estoque mínimo deve ser um número inteiro maior ou igual a zero.');
    }
  }

  paraLinhaDeDados() {
    return {
      id: this.id,
      nome: this.nome,
      categoria: this.categoria,
      unidadeMedida: this.unidadeMedida,
      quantidadeEstoque: this.quantidadeEstoque,
      estoqueMinimo: this.estoqueMinimo,
      dataValidade: this.dataValidade,
    };
  }
}
