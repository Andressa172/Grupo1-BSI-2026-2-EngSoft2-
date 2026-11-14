// Control - DoadorController (RF_B4)
import { Doador, type DoadorAtributos } from './model/Doador';
import { FiltroDoador, type FiltroDoadorAtributos } from './model/FiltroDoador';
import { Database } from './db/Database';
import { ErroNaoEncontrado, ErroRegraDeNegocio, ErroValidacao, type ErrosDeCampo } from './erros';

export type DadosDoador = Omit<DoadorAtributos, 'id'>;

const MENSAGEM_CAMPOS_INVALIDOS = 'Corrija os campos destacados.';
const MENSAGEM_CPF_CNPJ_DUPLICADO = 'Já existe um doador cadastrado com esse CPF/CNPJ.';

function lancarSeTiverErros(erros: ErrosDeCampo): void {
  if (Object.keys(erros).length > 0) {
    throw new ErroValidacao(MENSAGEM_CAMPOS_INVALIDOS, erros);
  }
}

export class DoadorController {
  private static instancia: DoadorController | undefined;

  private constructor(private readonly conexao: Database = Database.getInstancia()) {}

  static getInstancia(): DoadorController {
    if (!DoadorController.instancia) {
      DoadorController.instancia = new DoadorController();
    }
    return DoadorController.instancia;
  }

  async consultar(dadosFiltro: FiltroDoadorAtributos = {}): Promise<Doador[]> {
    const filtro = new FiltroDoador(dadosFiltro);
    lancarSeTiverErros(filtro.validar());
    return Doador.consultar(this.conexao, filtro);
  }

  async buscarPorId(id: number): Promise<Doador> {
    const doador = await Doador.buscarPorId(this.conexao, id);
    if (!doador) {
      throw new ErroNaoEncontrado('Doador não encontrado.');
    }
    return doador;
  }

  async cadastrar(dados: DadosDoador): Promise<Doador> {
    const doador = new Doador(dados);
    lancarSeTiverErros(doador.validar());

    if (!doador.isAnonimo() && (await doador.existeComMesmoCpfCnpj(this.conexao))) {
      throw new ErroValidacao(MENSAGEM_CPF_CNPJ_DUPLICADO, { cpfCnpj: 'Já existe um doador com esse CPF/CNPJ.' });
    }
    if (doador.isAnonimo() && (await doador.existeOutroAnonimo(this.conexao))) {
      throw new ErroRegraDeNegocio('Só pode existir um doador anônimo cadastrado.');
    }

    await doador.incluir(this.conexao);
    return doador;
  }

  async editar(id: number, dados: DadosDoador): Promise<Doador> {
    const existente = await this.buscarPorId(id);

    const atualizado = new Doador({ ...dados, id: existente.getId() });
    lancarSeTiverErros(atualizado.validar());

    if (!atualizado.isAnonimo() && (await atualizado.existeComMesmoCpfCnpj(this.conexao))) {
      throw new ErroValidacao(MENSAGEM_CPF_CNPJ_DUPLICADO, { cpfCnpj: 'Já existe um doador com esse CPF/CNPJ.' });
    }
    if (atualizado.isAnonimo() && (await atualizado.existeOutroAnonimo(this.conexao))) {
      throw new ErroRegraDeNegocio('Só pode existir um doador anônimo cadastrado.');
    }

    if (!(await atualizado.alterar(this.conexao))) {
      throw new ErroNaoEncontrado('Doador não encontrado.');
    }
    return atualizado;
  }

  async excluir(id: number): Promise<void> {
    const doador = await this.buscarPorId(id);

    // regra de negócio: não deixa excluir doador que já tem doação registrada (FK em doacao_produto/doacao_dinheiro)
    if (await doador.possuiDoacoesVinculadas(this.conexao)) {
      throw new ErroRegraDeNegocio('Este doador já possui doações registradas e não pode ser excluído.');
    }

    if (!(await doador.excluir(this.conexao))) {
      throw new ErroNaoEncontrado('Doador não encontrado.');
    }
  }
}
