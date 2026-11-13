// Control - DoadorController (RF_B4)
import { Doador, type DoadorAtributos } from './model/Doador';
import { FiltroDoador, type FiltroDoadorAtributos } from './model/FiltroDoador';
import { DoadorDAO } from './dao/DoadorDAO';
import { ErroNaoEncontrado, ErroRegraDeNegocio, ErroValidacao, type ErrosDeCampo } from './erros';

export type DadosDoador = Omit<DoadorAtributos, 'id'>;

const MENSAGEM_CAMPOS_INVALIDOS = 'Corrija os campos destacados.';

function lancarSeTiverErros(erros: ErrosDeCampo): void {
  if (Object.keys(erros).length > 0) {
    throw new ErroValidacao(MENSAGEM_CAMPOS_INVALIDOS, erros);
  }
}

export class DoadorController {
  private static instancia: DoadorController | undefined;

  // dao injetado pelo construtor pra dar pra trocar nos testes; quem cria é o singleton do DAO
  constructor(private readonly doadorDAO: DoadorDAO = DoadorDAO.getInstancia()) {}

  static getInstancia(): DoadorController {
    if (!DoadorController.instancia) {
      DoadorController.instancia = new DoadorController();
    }
    return DoadorController.instancia;
  }

  async listar(): Promise<Doador[]> {
    return this.doadorDAO.listarTodos();
  }

  async consultar(dadosFiltro: FiltroDoadorAtributos = {}): Promise<Doador[]> {
    const filtro = new FiltroDoador(dadosFiltro);
    lancarSeTiverErros(filtro.validar());
    return this.doadorDAO.consultar(filtro);
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
    lancarSeTiverErros(doador.validar());

    if (!doador.isAnonimo() && (await this.doadorDAO.existeComCpfCnpj(doador.getCpfCnpj()!))) {
      throw new ErroValidacao('Já existe um doador cadastrado com esse CPF/CNPJ.', {
        cpfCnpj: 'Já existe um doador com esse CPF/CNPJ.',
      });
    }
    if (doador.isAnonimo() && (await this.doadorDAO.existeAnonimo())) {
      throw new ErroRegraDeNegocio('Só pode existir um doador anônimo cadastrado.');
    }

    return this.doadorDAO.inserir(doador);
  }

  async editar(id: number, dados: DadosDoador): Promise<Doador> {
    const existente = await this.buscarPorId(id);

    const atualizado = new Doador({ ...dados, id: existente.getId() });
    lancarSeTiverErros(atualizado.validar());

    if (!atualizado.isAnonimo() && (await this.doadorDAO.existeComCpfCnpj(atualizado.getCpfCnpj()!, id))) {
      throw new ErroValidacao('Já existe um doador cadastrado com esse CPF/CNPJ.', {
        cpfCnpj: 'Já existe um doador com esse CPF/CNPJ.',
      });
    }
    if (atualizado.isAnonimo() && (await this.doadorDAO.existeAnonimo(id))) {
      throw new ErroRegraDeNegocio('Só pode existir um doador anônimo cadastrado.');
    }

    const resultado = await this.doadorDAO.atualizar(atualizado);
    if (!resultado) {
      throw new ErroNaoEncontrado('Doador não encontrado.');
    }
    return resultado;
  }

  async excluir(id: number): Promise<void> {
    await this.buscarPorId(id);

    // regra de negócio: não deixa excluir doador que já tem doação registrada (FK em doacao_produto/doacao_dinheiro)
    if (await this.doadorDAO.possuiDoacoesVinculadas(id)) {
      throw new ErroRegraDeNegocio('Este doador já possui doações registradas e não pode ser excluído.');
    }

    const excluiu = await this.doadorDAO.excluir(id);
    if (!excluiu) {
      throw new ErroNaoEncontrado('Doador não encontrado.');
    }
  }
}
