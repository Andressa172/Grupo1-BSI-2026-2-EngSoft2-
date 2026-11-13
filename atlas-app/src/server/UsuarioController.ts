// Control - UsuarioController (Autenticação e RF_B2 - Gerenciar Funcionários)
//
// - Singleton: uma única instância, guardada na propriedade estática `instancia`.
// - Façade: a View (via rotas /api/usuarios e /api/auth) só conhece estes métodos.
// - O Controller obtém a conexão com o banco (Database, também Singleton),
//   cria o Model Usuario / FiltroUsuario e decide quando validar e persistir.
//   Quem cria o UsuarioDAO é o Model.
import { Database } from './db/Database';
import { Usuario, type PerfilUsuario } from './model/Usuario';
import { FiltroUsuario, type FiltroUsuarioAtributos } from './model/FiltroUsuario';
import {
  ErroAutenticacao,
  ErroNaoEncontrado,
  ErroRegraDeNegocio,
  ErroValidacao,
  type ErrosDeCampo,
} from './erros';

export interface DadosCadastroUsuario {
  nome: string;
  login: string;
  senha: string;
  perfil: PerfilUsuario;
  cpf: string;
  ativo?: boolean;
}

export interface DadosEdicaoUsuario {
  nome: string;
  login: string;
  senha?: string;
  perfil: PerfilUsuario;
  cpf: string;
  ativo?: boolean;
}

const MENSAGEM_CAMPOS_INVALIDOS = 'Corrija os campos destacados.';
const MENSAGEM_LOGIN_DUPLICADO =
  'Este login já está em uso por outro funcionário. Escolha um identificador diferente.';
const MENSAGEM_CPF_DUPLICADO = 'Já existe um funcionário cadastrado com este CPF.';
const MENSAGEM_ULTIMO_ADM =
  'Não é permitido excluir, inativar ou alterar o cargo do único Gerente (ADM) ativo do sistema.';

// o id vem da URL: só aceita inteiro positivo que caiba na coluna SERIAL (int4)
const ID_MAXIMO = 2_147_483_647;
function validarId(id: number): void {
  if (!Number.isInteger(id) || id <= 0 || id > ID_MAXIMO) {
    throw new ErroNaoEncontrado('Funcionário não encontrado.');
  }
}

// o corpo da requisição precisa ser um objeto JSON
function comoObjeto<T>(dados: unknown): T {
  if (typeof dados !== 'object' || dados === null || Array.isArray(dados)) {
    throw new ErroValidacao('Dados inválidos.');
  }
  return dados as T;
}

function lancarSeTiverErros(erros: ErrosDeCampo): void {
  if (Object.keys(erros).length > 0) {
    throw new ErroValidacao(MENSAGEM_CAMPOS_INVALIDOS, erros);
  }
}

export class UsuarioController {
  private static instancia: UsuarioController | undefined;

  // conexão com o banco, aberta e mantida pelo Controller
  private readonly conexao: Database;

  private constructor() {
    this.conexao = Database.getInstancia();
  }

  static getInstancia(): UsuarioController {
    if (!UsuarioController.instancia) {
      UsuarioController.instancia = new UsuarioController();
    }
    return UsuarioController.instancia;
  }

  async autenticar(login: unknown, senha: unknown): Promise<Usuario> {
    const loginLimpo = typeof login === 'string' ? login.trim() : '';
    const senhaLimpa = typeof senha === 'string' ? senha : '';

    const erros: ErrosDeCampo = {};
    if (!loginLimpo) {
      erros.login = 'Campo obrigatório: por favor, informe o usuário.';
    }
    if (!senhaLimpa) {
      erros.senha = 'Campo obrigatório: por favor, informe a senha.';
    }
    if (Object.keys(erros).length > 0) {
      throw new ErroValidacao('Preencha os campos obrigatórios.', erros);
    }

    const usuario = await Usuario.buscarPorLogin(this.conexao, loginLimpo);
    if (!usuario || usuario.getSenhaHash() !== senhaLimpa) {
      throw new ErroAutenticacao('Usuário não encontrado.');
    }

    if (!usuario.isAtivo()) {
      throw new ErroAutenticacao(
        'Este funcionário está inativo (desabilitado para uso). Entre em contato com um Gerente.'
      );
    }

    return usuario;
  }

  async consultar(dadosFiltro: FiltroUsuarioAtributos = {}): Promise<Usuario[]> {
    const filtro = new FiltroUsuario(dadosFiltro);
    lancarSeTiverErros(filtro.validar());
    return Usuario.consultar(this.conexao, filtro);
  }

  async listar(): Promise<Usuario[]> {
    return this.consultar();
  }

  async buscarPorId(id: number): Promise<Usuario> {
    validarId(id);
    const usuario = await Usuario.buscarPorId(this.conexao, id);
    if (!usuario) {
      throw new ErroNaoEncontrado('Funcionário não encontrado.');
    }
    return usuario;
  }

  async cadastrar(entrada: unknown): Promise<Usuario> {
    const dados = comoObjeto<DadosCadastroUsuario>(entrada);
    const usuario = new Usuario({
      nome: dados.nome,
      login: dados.login,
      senhaHash: dados.senha,
      perfil: dados.perfil,
      cpf: dados.cpf,
      ativo: dados.ativo ?? true,
    });
    lancarSeTiverErros(usuario.validar());

    const errosDuplicidade: ErrosDeCampo = {};
    if (await usuario.existeOutroComMesmoLogin(this.conexao)) {
      errosDuplicidade.login = MENSAGEM_LOGIN_DUPLICADO;
    }
    if (await usuario.existeOutroComMesmoCpf(this.conexao)) {
      errosDuplicidade.cpf = MENSAGEM_CPF_DUPLICADO;
    }
    if (Object.keys(errosDuplicidade).length > 0) {
      const mensagemPrincipal = errosDuplicidade.login ?? errosDuplicidade.cpf ?? MENSAGEM_CAMPOS_INVALIDOS;
      throw new ErroValidacao(mensagemPrincipal, errosDuplicidade);
    }

    await usuario.incluir(this.conexao);
    return usuario;
  }

  async editar(id: number, entrada: unknown): Promise<Usuario> {
    const existente = await this.buscarPorId(id);
    const dados = comoObjeto<DadosEdicaoUsuario>(entrada);

    const novaSenhaInformada = Boolean(dados.senha && dados.senha.trim().length > 0);
    const senhaHashFinal = novaSenhaInformada ? dados.senha!.trim() : existente.getSenhaHash();

    const atualizado = new Usuario({
      id: existente.getId(),
      nome: dados.nome,
      login: dados.login,
      senhaHash: senhaHashFinal,
      perfil: dados.perfil,
      cpf: dados.cpf,
      ativo: dados.ativo ?? existente.isAtivo(),
    });

    lancarSeTiverErros(atualizado.validar({ senhaOpcional: !novaSenhaInformada }));

    // Regra de negócio: não permitir inativar ou rebaixar o único Gerente (ADM) ativo
    const eraGerenteAtivo = existente.getPerfil() === 'GERENTE' && existente.isAtivo();
    const deixaraDeSerGerenteAtivo = atualizado.getPerfil() !== 'GERENTE' || !atualizado.isAtivo();
    if (eraGerenteAtivo && deixaraDeSerGerenteAtivo) {
      const outrosGerentesAtivos = await Usuario.contarGerentesAtivos(this.conexao, id);
      if (outrosGerentesAtivos === 0) {
        throw new ErroRegraDeNegocio(MENSAGEM_ULTIMO_ADM);
      }
    }

    const errosDuplicidade: ErrosDeCampo = {};
    if (await atualizado.existeOutroComMesmoLogin(this.conexao)) {
      errosDuplicidade.login = MENSAGEM_LOGIN_DUPLICADO;
    }
    if (await atualizado.existeOutroComMesmoCpf(this.conexao)) {
      errosDuplicidade.cpf = MENSAGEM_CPF_DUPLICADO;
    }
    if (Object.keys(errosDuplicidade).length > 0) {
      const mensagemPrincipal = errosDuplicidade.login ?? errosDuplicidade.cpf ?? MENSAGEM_CAMPOS_INVALIDOS;
      throw new ErroValidacao(mensagemPrincipal, errosDuplicidade);
    }

    if (!(await atualizado.alterar(this.conexao))) {
      throw new ErroNaoEncontrado('Funcionário não encontrado.');
    }

    return atualizado;
  }

  async excluir(id: number): Promise<void> {
    const existente = await this.buscarPorId(id);

    // Regra de negócio: não excluir todos os ADM (GERENTE)
    if (existente.getPerfil() === 'GERENTE' && existente.isAtivo()) {
      const outrosGerentesAtivos = await Usuario.contarGerentesAtivos(this.conexao, id);
      if (outrosGerentesAtivos === 0) {
        throw new ErroRegraDeNegocio(MENSAGEM_ULTIMO_ADM);
      }
    }

    if (!(await existente.excluir(this.conexao))) {
      throw new ErroNaoEncontrado('Funcionário não encontrado.');
    }
  }
}
