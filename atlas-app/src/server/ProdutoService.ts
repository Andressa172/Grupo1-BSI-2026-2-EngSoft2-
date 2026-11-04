/**
 * RF_B3 - Gerenciar produtos
 *
 * Classe que cuida dos produtos do ATLAS, usando o padrão Singleton:
 * existe uma única instância dela no servidor, e todas as rotas da API
 * usam essa mesma instância (e, portanto, a mesma lista de produtos).
 *
 * Por enquanto os dados ficam em memória: ao reiniciar o servidor,
 * a lista volta para os produtos de exemplo.
 */

import type { Produto } from '@/lib/types';

export type DadosProduto = Omit<Produto, 'id' | 'quantidadeEstoque'>;

// Guarda a instância no objeto global do Node. No modo dev o Next.js
// carrega cada rota separadamente, e sem isso cada rota teria sua própria cópia.
const globalParaSingleton = globalThis as unknown as { produtoService?: ProdutoService };

export class ProdutoService {
  private produtos: Produto[] = [];
  private proximoId = 1;

  // Construtor privado: ninguém de fora consegue fazer "new ProdutoService()"
  private constructor() {
    this.cadastrar({ nome: 'Arroz 5kg', categoria: 'Alimento', unidadeMedida: 'pacote', estoqueMinimo: 10, dataValidade: '2027-03-01' });
    this.cadastrar({ nome: 'Feijão 1kg', categoria: 'Alimento', unidadeMedida: 'pacote', estoqueMinimo: 15, dataValidade: '2026-12-15' });
    this.cadastrar({ nome: 'Sabonete', categoria: 'Higiene', unidadeMedida: 'unidade', estoqueMinimo: 20 });
  }

  // Única forma de pegar o ProdutoService
  static getInstancia(): ProdutoService {
    if (!globalParaSingleton.produtoService) {
      globalParaSingleton.produtoService = new ProdutoService();
    }
    return globalParaSingleton.produtoService;
  }

  listar(): Produto[] {
    return this.produtos;
  }

  buscarPorId(id: string): Produto | undefined {
    return this.produtos.find((p) => p.id === id);
  }

  cadastrar(dados: DadosProduto): Produto {
    this.validar(dados);
    const novo: Produto = {
      id: String(this.proximoId),
      nome: dados.nome.trim(),
      categoria: dados.categoria,
      unidadeMedida: dados.unidadeMedida.trim(),
      quantidadeEstoque: 0, // a quantidade só muda pela tela de Estoque (RF_F1)
      estoqueMinimo: Number(dados.estoqueMinimo),
      dataValidade: dados.dataValidade || undefined,
    };
    this.proximoId++;
    this.produtos.push(novo);
    return novo;
  }

  editar(id: string, dados: DadosProduto): Produto {
    const produto = this.buscarPorId(id);
    if (!produto) {
      throw new Error('Produto não encontrado.');
    }
    this.validar(dados, id);
    produto.nome = dados.nome.trim();
    produto.categoria = dados.categoria;
    produto.unidadeMedida = dados.unidadeMedida.trim();
    produto.estoqueMinimo = Number(dados.estoqueMinimo);
    produto.dataValidade = dados.dataValidade || undefined;
    return produto;
  }

  excluir(id: string): void {
    const produto = this.buscarPorId(id);
    if (!produto) {
      throw new Error('Produto não encontrado.');
    }
    this.produtos = this.produtos.filter((p) => p.id !== id);
  }

  // Regras do cadastro. "idIgnorado" é o próprio produto, no caso de edição.
  private validar(dados: DadosProduto, idIgnorado?: string): void {
    if (!dados.nome || dados.nome.trim() === '') {
      throw new Error('O nome do produto é obrigatório.');
    }
    if (!dados.unidadeMedida || dados.unidadeMedida.trim() === '') {
      throw new Error('A unidade de medida é obrigatória.');
    }
    if (isNaN(Number(dados.estoqueMinimo)) || Number(dados.estoqueMinimo) < 0) {
      throw new Error('O estoque mínimo não pode ser negativo.');
    }
    const nomeRepetido = this.produtos.some(
      (p) => p.id !== idIgnorado && p.nome.toLowerCase() === dados.nome.trim().toLowerCase()
    );
    if (nomeRepetido) {
      throw new Error('Já existe um produto com esse nome.');
    }
  }
}
