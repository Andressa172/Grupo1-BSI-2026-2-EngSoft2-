// Service - DoacaoService (RF_F3 - Doação de Produto e RF_F11 - Doação em Dinheiro)
// Responsável por instanciar e acionar os Controllers de doação, evitando que as
// Controllers se auto-instanciem via Singleton.
import { ReceberDoacaoDinheiroController } from '../ReceberDoacaoDinheiroController';
import { ReceberDoacaoProdutoController } from '../ReceberDoacaoProdutoController';
import type { DoacaoDinheiroRegistro } from '../dao/DoacaoDinheiroDAO';
import type { DoacaoProdutoRegistro } from '../dao/DoacaoProdutoDAO';
import type { DoacaoDinheiro } from '../model/DoacaoDinheiro';
import type { DoacaoProduto } from '../model/DoacaoProduto';
import type { FiltroDoacaoAtributos } from '../model/FiltroDoacao';

export class DoacaoService {
  private readonly dinheiroController: ReceberDoacaoDinheiroController;
  private readonly produtoController: ReceberDoacaoProdutoController;

  constructor(
    dinheiroController: ReceberDoacaoDinheiroController = new ReceberDoacaoDinheiroController(),
    produtoController: ReceberDoacaoProdutoController = new ReceberDoacaoProdutoController()
  ) {
    this.dinheiroController = dinheiroController;
    this.produtoController = produtoController;
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
