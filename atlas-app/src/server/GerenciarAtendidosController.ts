// Control - GerenciarAtendidosController (RF_B1 - Gerenciar atendidos)
//
// - Singleton: uma única instância, guardada na propriedade estática `instancia`.
// - Façade: a View (via rotas /api/atendidos) só conhece estes métodos.
// - O Controller obtém a conexão com o banco (Database, também Singleton),
//   cria o Model Atendido e decide quando validar e persistir.
//   Quem cria o AtendidoDAO é o Model.
import { Database } from './db/Database';
import { Atendido, type AtendidoAtributos } from './model/Atendido';
import { FiltroAtendido, type FiltroAtendidoAtributos } from './model/FiltroAtendido';
import { ErroNaoEncontrado, ErroValidacao, type ErrosDeCampo } from './erros';

export type DadosAtendido = Omit<AtendidoAtributos, 'id' | 'dataCadastro'>;

const MENSAGEM_CAMPOS_INVALIDOS = 'Corrija os campos destacados.';
const MENSAGEM_DUPLICADO = 'Atendido já cadastrado (mesmo nome e data de nascimento).';

function lancarSeTiverErros(erros: ErrosDeCampo): void {
  if (Object.keys(erros).length > 0) {
    throw new ErroValidacao(MENSAGEM_CAMPOS_INVALIDOS, erros);
  }
}

// o id vem da URL: só aceita inteiro positivo que caiba na coluna SERIAL (int4)
const ID_MAXIMO = 2_147_483_647;
function validarId(id: number): void {
  if (!Number.isInteger(id) || id <= 0 || id > ID_MAXIMO) {
    throw new ErroNaoEncontrado('Atendido não encontrado.');
  }
}

// o corpo da requisição precisa ser um objeto JSON
function comoObjeto(dados: unknown): DadosAtendido {
  if (typeof dados !== 'object' || dados === null || Array.isArray(dados)) {
    throw new ErroValidacao('Dados inválidos.');
  }
  return dados as DadosAtendido;
}

export class GerenciarAtendidosController {
  private static instancia: GerenciarAtendidosController | undefined;

  // conexão com o banco, aberta e mantida pelo Controller
  private readonly conexao: Database;

  private constructor() {
    this.conexao = Database.getInstancia();
  }

  static getInstancia(): GerenciarAtendidosController {
    if (!GerenciarAtendidosController.instancia) {
      GerenciarAtendidosController.instancia = new GerenciarAtendidosController();
    }
    return GerenciarAtendidosController.instancia;
  }

  async consultar(dadosFiltro: FiltroAtendidoAtributos = {}): Promise<Atendido[]> {
    const filtro = new FiltroAtendido(dadosFiltro);
    lancarSeTiverErros(filtro.validar());
    return Atendido.consultar(this.conexao, filtro);
  }

  async buscarPorId(id: number): Promise<Atendido> {
    validarId(id);
    const atendido = await Atendido.buscarPorId(this.conexao, id);
    if (!atendido) {
      throw new ErroNaoEncontrado('Atendido não encontrado.');
    }
    return atendido;
  }

  async cadastrar(dados: unknown): Promise<Atendido> {
    const atendido = new Atendido(comoObjeto(dados));
    lancarSeTiverErros(atendido.validar());

    if (await atendido.existeOutroIgual(this.conexao)) {
      throw new ErroValidacao(MENSAGEM_DUPLICADO, { nome: MENSAGEM_DUPLICADO });
    }

    await atendido.incluir(this.conexao);
    return atendido;
  }

  async editar(id: number, dados: unknown): Promise<Atendido> {
    const existente = await this.buscarPorId(id);
    const atendido = new Atendido({
      ...comoObjeto(dados),
      id: existente.getId(),
      dataCadastro: existente.paraLinhaDeDados().dataCadastro,
    });
    lancarSeTiverErros(atendido.validar());

    if (await atendido.existeOutroIgual(this.conexao)) {
      throw new ErroValidacao(MENSAGEM_DUPLICADO, { nome: MENSAGEM_DUPLICADO });
    }

    if (!(await atendido.alterar(this.conexao))) {
      throw new ErroNaoEncontrado('Atendido não encontrado.');
    }
    return atendido;
  }

  async excluir(id: number): Promise<void> {
    const atendido = await this.buscarPorId(id);
    if (!(await atendido.excluir(this.conexao))) {
      throw new ErroNaoEncontrado('Atendido não encontrado.');
    }
  }
}
