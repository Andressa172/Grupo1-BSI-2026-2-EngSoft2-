// Control - UsuarioController (Autenticação e RF_B2 - Gerenciar Funcionários)
import { Usuario, type PerfilUsuario } from './model/Usuario';
import { UsuarioDAO } from './dao/UsuarioDAO';
import { ErroAutenticacao, ErroValidacao } from './erros';

export interface DadosCadastroUsuario {
  nome: string;
  login: string;
  senha: string;
  perfil: PerfilUsuario;
  cpf: string;
}

const globalParaSingleton = globalThis as unknown as { usuarioController?: UsuarioController };

export class UsuarioController {
  // dao injetado pelo construtor pra dar pra trocar nos testes
  constructor(private readonly usuarioDAO: UsuarioDAO = new UsuarioDAO()) {}

  static getInstancia(): UsuarioController {
    if (!globalParaSingleton.usuarioController) {
      globalParaSingleton.usuarioController = new UsuarioController();
    }
    return globalParaSingleton.usuarioController;
  }

  async autenticar(login: string, senha: string): Promise<Usuario> {
    const loginLimpo = login?.trim() ?? '';
    if (!loginLimpo || !senha) {
      throw new ErroValidacao('Informe o usuário e a senha.');
    }

    const usuario = await this.usuarioDAO.buscarPorLogin(loginLimpo);
    if (!usuario || !usuario.isAtivo() || usuario.getSenhaHash() !== senha) {
      throw new ErroAutenticacao('Credenciais inválidas.');
    }

    return usuario;
  }

  async listar(): Promise<Usuario[]> {
    return this.usuarioDAO.listarTodos();
  }

  async cadastrar(dados: DadosCadastroUsuario): Promise<Usuario> {
    const usuario = new Usuario({
      nome: dados.nome,
      login: dados.login,
      senhaHash: dados.senha,
      perfil: dados.perfil,
      cpf: dados.cpf,
      ativo: true,
    });
    usuario.validar();

    if (await this.usuarioDAO.existeComLogin(usuario.getLogin())) {
      throw new ErroValidacao('Já existe um funcionário cadastrado com esse login.');
    }

    if (usuario.getCpf() && (await this.usuarioDAO.existeComCpf(usuario.getCpf()!))) {
      throw new ErroValidacao('Já existe um funcionário cadastrado com esse CPF.');
    }

    return this.usuarioDAO.inserir(usuario);
  }
}
