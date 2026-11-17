// Service - UsuarioService (Autenticação e RF_B2 - Gerenciar Funcionários)
// Responsável por instanciar e acionar o UsuarioController, evitando que a
// Controller se auto-instancie via Singleton.
import { UsuarioController } from '../UsuarioController';
import type { FiltroUsuarioAtributos } from '../model/FiltroUsuario';
import type { Usuario } from '../model/Usuario';

export class UsuarioService {
  private readonly controller: UsuarioController;

  constructor(controller: UsuarioController = new UsuarioController()) {
    this.controller = controller;
  }

  async autenticar(login: unknown, senha: unknown): Promise<Usuario> {
    return this.controller.autenticar(login, senha);
  }

  async consultar(dadosFiltro: FiltroUsuarioAtributos = {}): Promise<Usuario[]> {
    return this.controller.consultar(dadosFiltro);
  }

  async listar(): Promise<Usuario[]> {
    return this.controller.listar();
  }

  async buscarPorId(id: number): Promise<Usuario> {
    return this.controller.buscarPorId(id);
  }

  async cadastrar(entrada: unknown): Promise<Usuario> {
    return this.controller.cadastrar(entrada);
  }

  async editar(id: number, entrada: unknown): Promise<Usuario> {
    return this.controller.editar(id, entrada);
  }

  async excluir(id: number): Promise<void> {
    return this.controller.excluir(id);
  }
}

