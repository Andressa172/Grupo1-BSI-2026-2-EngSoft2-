// Service - DoacaoService (RF_B4 Doadores, RF_F3 Doação de Produto e RF_F11 Doação em Dinheiro)
// Responsável por instanciar e acionar os Controllers do módulo de doações, evitando que as
// Controllers se auto-instanciem via Singleton.
import { DoadorController, type DadosDoador } from '../DoadorController';
import { ReceberDoacaoDinheiroController } from '../ReceberDoacaoDinheiroController';
import { ReceberDoacaoProdutoController } from '../ReceberDoacaoProdutoController';
import type { DoacaoDinheiroRegistro } from '../dao/DoacaoDinheiroDAO';
import type { DoacaoProdutoRegistro } from '../dao/DoacaoProdutoDAO';
import type { DoacaoDinheiro } from '../model/DoacaoDinheiro';
import type { DoacaoProduto } from '../model/DoacaoProduto';
import type { Doador } from '../model/Doador';
import type { FiltroDoacaoAtributos } from '../model/FiltroDoacao';
import type { FiltroDoadorAtributos } from '../model/FiltroDoador';

export type { DadosDoador };

export class DoacaoService {
  private readonly doadorController: DoadorController;
  private readonly dinheiroController: ReceberDoacaoDinheiroController;
  private readonly produtoController: ReceberDoacaoProdutoController;

  constructor(
    dinheiroController: ReceberDoacaoDinheiroController = new ReceberDoacaoDinheiroController(),
    produtoController: ReceberDoacaoProdutoController = new ReceberDoacaoProdutoController(),
    doadorController: DoadorController = new DoadorController()
  ) {
    this.dinheiroController = dinheiroController;
    this.produtoController = produtoController;
    this.doadorController = doadorController;
  }

  async consultarDoadores(dadosFiltro: FiltroDoadorAtributos = {}): Promise<Doador[]> {
    return this.doadorController.consultar(dadosFiltro);
  }

  async buscarDoadorPorId(id: number): Promise<Doador> {
    return this.doadorController.buscarPorId(id);
  }

  async cadastrarDoador(dados: DadosDoador): Promise<Doador> {
    return this.doadorController.cadastrar(dados);
  }

  async editarDoador(id: number, dados: DadosDoador): Promise<Doador> {
    return this.doadorController.editar(id, dados);
  }

  async excluirDoador(id: number): Promise<void> {
    return this.doadorController.excluir(id);
  }

  async consultarDinheiro(dadosFiltro: FiltroDoacaoAtributos = {}): Promise<DoacaoDinheiroRegistro[]> {
    return this.dinheiroController.consultar(dadosFiltro);
  }

  async registrarDinheiro(dados: unknown): Promise<DoacaoDinheiro> {
    return this.dinheiroController.registrar(dados);
  }

  async consultarProduto(dadosFiltro: FiltroDoacaoAtributos = {}): Promise<DoacaoProdutoRegistro[]> {
    return this.produtoController.consultar(dadosFiltro);
  }

  async registrarProduto(dados: unknown): Promise<DoacaoProduto> {
    return this.produtoController.registrar(dados);
  }
}
