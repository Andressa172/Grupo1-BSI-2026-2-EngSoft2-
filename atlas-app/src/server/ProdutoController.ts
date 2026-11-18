// Control - ProdutoController (RF_B3 - Gerenciar produtos)
//
// - Não se auto-instancia: quem usa o Controller (a rota ou outro caso de uso) cria com `new`.
// - Façade: a View (via rotas /api/produtos) só conhece estes métodos.
// - O Controller obtém a conexão com o banco (Database, também Singleton),
//   cria o Model Produto e decide quando validar e persistir.
//   Quem cria o ProdutoDAO é o Model.
import { Database } from './db/Database';
import { Produto, type ProdutoAtributos } from './model/Produto';
import { FiltroProduto, type FiltroProdutoAtributos } from './model/FiltroProduto';
import { ErroNaoEncontrado, ErroValidacao, type ErrosDeCampo } from './erros';

// a quantidade em estoque não vem do cadastro: ela só muda por movimentação (RF_F1)
export type DadosProduto = Omit<ProdutoAtributos, 'id' | 'quantidadeEstoque'>;

const MENSAGEM_CAMPOS_INVALIDOS = 'Corrija os campos destacados.';
const MENSAGEM_NOME_DUPLICADO = 'Já existe um produto cadastrado com esse nome.';

function lancarSeTiverErros(erros: ErrosDeCampo): void {
  if (Object.keys(erros).length > 0) {
    throw new ErroValidacao(MENSAGEM_CAMPOS_INVALIDOS, erros);
  }
}

export class ProdutoController {
  // conexão com o banco, aberta e mantida pelo Controller
  private readonly conexao: Database;

  constructor() {
    this.conexao = Database.getInstancia();
  }

  async consultar(dadosFiltro: FiltroProdutoAtributos = {}): Promise<Produto[]> {
    const filtro = new FiltroProduto(dadosFiltro);
    lancarSeTiverErros(filtro.validar());
    return Produto.consultar(this.conexao, filtro);
  }

  async buscarPorId(id: number): Promise<Produto> {
    const produto = await Produto.buscarPorId(this.conexao, id);
    if (!produto) {
      throw new ErroNaoEncontrado('Produto não encontrado.');
    }
    return produto;
  }

  async cadastrar(dados: DadosProduto): Promise<Produto> {
    const produto = new Produto({ ...dados, quantidadeEstoque: 0 });
    lancarSeTiverErros(produto.validar());

    // regra de negócio: não pode haver dois produtos com o mesmo nome
    if (await produto.existeOutroComMesmoNome(this.conexao)) {
      throw new ErroValidacao(MENSAGEM_NOME_DUPLICADO, { nome: MENSAGEM_NOME_DUPLICADO });
    }

    await produto.incluir(this.conexao);
    return produto;
  }

  async editar(id: number, dados: DadosProduto): Promise<Produto> {
    const existente = await this.buscarPorId(id);

    // mantém a quantidade que já estava no estoque
    const produto = new Produto({ ...dados, id: existente.getId(), quantidadeEstoque: existente.getQuantidadeEstoque() });
    lancarSeTiverErros(produto.validar(existente.getDataValidade()));

    if (await produto.existeOutroComMesmoNome(this.conexao)) {
      throw new ErroValidacao(MENSAGEM_NOME_DUPLICADO, { nome: MENSAGEM_NOME_DUPLICADO });
    }

    if (!(await produto.alterar(this.conexao))) {
      throw new ErroNaoEncontrado('Produto não encontrado.');
    }
    return produto;
  }

  async excluir(id: number): Promise<void> {
    const produto = await this.buscarPorId(id);
    if (!(await produto.excluir(this.conexao))) {
      throw new ErroNaoEncontrado('Produto não encontrado.');
    }
  }
}
