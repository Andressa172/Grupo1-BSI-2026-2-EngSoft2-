// Control - DoadorController (RF_B4)
import { Doador, type DoadorAtributos } from './model/Doador';
import { DoadorDAO } from './dao/DoadorDAO';
import { ErroNaoEncontrado, ErroValidacao } from './erros';

export type DadosDoador = Omit<DoadorAtributos, 'id'>;

const globalParaSingleton = globalThis as unknown as { doadorController?: DoadorController };

export class DoadorController {
  // dao injetado pelo construtor pra dar pra trocar nos testes
  constructor(private readonly doadorDAO: DoadorDAO = new DoadorDAO()) {}

  static getInstancia(): DoadorController {
    if (!globalParaSingleton.doadorController) {
      globalParaSingleton.doadorController = new DoadorController();
    }
    return globalParaSingleton.doadorController;
  }

  async listar(): Promise<Doador[]> {
    return this.doadorDAO.listarTodos();
  }

  async buscarPorId(id: number): Promise<Doador> {
    const doador = await this.doadorDAO.buscarPorId(id);
    if (!doador) {
      throw new ErroNaoEncontrado('Doador não encontrado.');
    }
    return doador;
  }

  async cadastrar(dados: DadosDoador): Promise<Doador> {
    const doador = new Doador(dados);
    doador.validar();

    if (!doador.isAnonimo() && (await this.doadorDAO.existeComNome(doador.getNome()))) {
      throw new ErroValidacao('Já existe um doador cadastrado com esse nome.');
    }

    return this.doadorDAO.inserir(doador);
  }

  async editar(id: number, dados: DadosDoador): Promise<Doador> {
    const existente = await this.buscarPorId(id);

    const atualizado = new Doador({ ...dados, id: existente.getId() });
    atualizado.validar();

    if (!atualizado.isAnonimo() && (await this.doadorDAO.existeComNome(atualizado.getNome(), id))) {
      throw new ErroValidacao('Já existe um doador cadastrado com esse nome.');
    }

    const resultado = await this.doadorDAO.atualizar(atualizado);
    if (!resultado) {
      throw new ErroNaoEncontrado('Doador não encontrado.');
    }
    return resultado;
  }

  async excluir(id: number): Promise<void> {
    const excluiu = await this.doadorDAO.excluir(id);
    if (!excluiu) {
      throw new ErroNaoEncontrado('Doador não encontrado.');
    }
  }
}
