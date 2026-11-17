// Service - AtendidoService (RF_B1 - Gerenciar atendidos)
// Responsável por instanciar e acionar o GerenciarAtendidosController, evitando que a
// Controller se auto-instancie via Singleton.
import { GerenciarAtendidosController } from '../GerenciarAtendidosController';
import type { Atendido } from '../model/Atendido';
import type { FiltroAtendidoAtributos } from '../model/FiltroAtendido';

export class AtendidoService {
  private readonly controller: GerenciarAtendidosController;

  constructor(controller: GerenciarAtendidosController = new GerenciarAtendidosController()) {
    this.controller = controller;
  }

  async consultar(dadosFiltro: FiltroAtendidoAtributos = {}): Promise<Atendido[]> {
    return this.controller.consultar(dadosFiltro);
  }

  async buscarPorId(id: number): Promise<Atendido> {
    return this.controller.buscarPorId(id);
  }

  async cadastrar(entrada: unknown): Promise<Atendido> {
    return this.controller.cadastrar(entrada);
  }

  async editar(id: number, entrada: unknown): Promise<Atendido> {
    return this.controller.editar(id, entrada);
  }

  async excluir(id: number): Promise<void> {
    return this.controller.excluir(id);
  }
}
