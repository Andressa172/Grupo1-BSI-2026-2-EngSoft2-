// Control - ProdutoController (RF_B3 - Gerenciar produtos)
import { Produto, type ProdutoAtributos } from './model/Produto';
import { ProdutoDAO } from './dao/ProdutoDAO';
import { ErroNaoEncontrado, ErroValidacao } from './erros';

// a quantidade em estoque não vem do cadastro: ela só muda por movimentação (RF_F1)
export type DadosProduto = Omit<ProdutoAtributos, 'id' | 'quantidadeEstoque'>;

const globalParaSingleton = globalThis as unknown as { produtoController?: ProdutoController };

export class ProdutoController {
  // dao injetado pelo construtor pra dar pra trocar nos testes
  constructor(private readonly produtoDAO: ProdutoDAO = new ProdutoDAO()) {}

  static getInstancia(): ProdutoController {
    if (!globalParaSingleton.produtoController) {
      globalParaSingleton.produtoController = new ProdutoController();
    }
    return globalParaSingleton.produtoController;
  }

  async listar(): Promise<Produto[]> {
    return this.produtoDAO.listarProdutos();
  }

  async buscarPorId(id: number): Promise<Produto> {
    const produto = await this.produtoDAO.buscarPorId(id);
    if (!produto) {
      throw new ErroNaoEncontrado('Produto não encontrado.');
    }
    return produto;
  }

  async cadastrar(dados: DadosProduto): Promise<Produto> {
    const produto = new Produto({ ...dados, quantidadeEstoque: 0 });
    produto.validar();

    if (await this.produtoDAO.existeComNome(produto.getNome())) {
      throw new ErroValidacao('Já existe um produto cadastrado com esse nome.');
    }

    return this.produtoDAO.inserir(produto);
  }

  async editar(id: number, dados: DadosProduto): Promise<Produto> {
    const existente = await this.buscarPorId(id);

    // mantém a quantidade que já estava no estoque
    const atualizado = new Produto({ ...dados, id: existente.getId(), quantidadeEstoque: existente.getQuantidadeEstoque() });
    atualizado.validar();

    if (await this.produtoDAO.existeComNome(atualizado.getNome(), id)) {
      throw new ErroValidacao('Já existe um produto cadastrado com esse nome.');
    }

    const resultado = await this.produtoDAO.atualizar(atualizado);
    if (!resultado) {
      throw new ErroNaoEncontrado('Produto não encontrado.');
    }
    return resultado;
  }

  async excluir(id: number): Promise<void> {
    const excluiu = await this.produtoDAO.excluir(id);
    if (!excluiu) {
      throw new ErroNaoEncontrado('Produto não encontrado.');
    }
  }
}
