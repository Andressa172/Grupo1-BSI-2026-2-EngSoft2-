// Control - ReceberDoacaoProdutoController (RF_F3 - Receber doação de produto)
//
// - Singleton: uma única instância, guardada na propriedade estática `instancia`.
// - Façade: a View (via rotas /api/doacoes/produto) só conhece estes métodos.
// - Abre e mantém a conexão com o banco (Database, Singleton), cria o Model DoacaoProduto,
//   decide quando validar e persistir e controla a transação (tudo grava ou nada grava).
//   Quem cria o DAO é o Model; a entrada no estoque (RF_F1) é pedida por este Controller ao
//   AtualizarEstoqueController, item a item, dentro da mesma transação.
import { Database } from './db/Database';
import { AtualizarEstoqueController } from './AtualizarEstoqueController';
import { DoacaoProduto, type DoacaoProdutoAtributos } from './model/DoacaoProduto';
import { FiltroDoacao, type FiltroDoacaoAtributos } from './model/FiltroDoacao';
import type { DoacaoProdutoRegistro } from './dao/DoacaoProdutoDAO';
import { ErroValidacao, type ErrosDeCampo } from './erros';

const MENSAGEM_CAMPOS_INVALIDOS = 'Corrija os campos destacados.';

function lancarSeTiverErros(erros: ErrosDeCampo): void {
  if (Object.keys(erros).length > 0) {
    throw new ErroValidacao(MENSAGEM_CAMPOS_INVALIDOS, erros);
  }
}

function comoObjeto(dados: unknown): Partial<DoacaoProdutoAtributos> {
  if (typeof dados !== 'object' || dados === null || Array.isArray(dados)) {
    throw new ErroValidacao('Dados inválidos.');
  }
  return dados as Partial<DoacaoProdutoAtributos>;
}

export class ReceberDoacaoProdutoController {
  private static instancia: ReceberDoacaoProdutoController | undefined;

  // conexão com o banco, aberta e mantida pelo Controller
  private readonly conexao: Database;

  private constructor() {
    this.conexao = Database.getInstancia();
  }

  static getInstancia(): ReceberDoacaoProdutoController {
    if (!ReceberDoacaoProdutoController.instancia) {
      ReceberDoacaoProdutoController.instancia = new ReceberDoacaoProdutoController();
    }
    return ReceberDoacaoProdutoController.instancia;
  }

  /** Consulta com 2 filtros: doador e período. */
  async consultar(dadosFiltro: FiltroDoacaoAtributos = {}): Promise<DoacaoProdutoRegistro[]> {
    const filtro = new FiltroDoacao(dadosFiltro);
    lancarSeTiverErros(filtro.validar());
    return DoacaoProduto.consultar(this.conexao, filtro);
  }

  /** Passos 1 a 9 do fluxo básico: valida tudo e só então registra a doação e dá entrada no estoque. */
  async registrar(dados: unknown): Promise<DoacaoProduto> {
    const doacao = new DoacaoProduto(comoObjeto(dados));
    lancarSeTiverErros(doacao.validar());
    await this.conexao.comTransacao(async (cliente) => {
      await doacao.incluir(cliente);

      const itens = doacao.getItens();
      for (let i = 0; i < itens.length; i++) {
        const item = itens[i];
        const resultado = await AtualizarEstoqueController.getInstancia().atualizarEstoque(cliente, {
          produtoId: item.getProdutoId(),
          tipo: 'ENTRADA',
          quantidade: item.getQuantidade(),
          origem: `Doação de produto #${doacao.getId()}`,
          dataValidade: item.getDataValidade(),
        });
        if (resultado !== 'APLICADA') {
          throw new ErroValidacao('Produto inválido.', { [`item.${i}.produto`]: 'Produto inválido: não cadastrado.' });
        }
        await doacao.incluirItem(cliente, item);
      }
    });
    return doacao;
  }
}
