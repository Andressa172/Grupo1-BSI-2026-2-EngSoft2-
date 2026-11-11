// Control - ReceberDoacaoProdutoController (RF_F3 - Receber doação de produto)
//
// - Singleton: uma única instância, guardada na propriedade estática `instancia`.
// - Façade: a View (via rotas /api/doacoes/produto) só conhece estes métodos.
// - Abre e mantém a conexão com o banco (Database, Singleton), cria o Model DoacaoProduto,
//   decide quando validar e persistir e controla a transação (tudo grava ou nada grava).
//   Quem cria o DAO é o Model.
import { Database } from './db/Database';
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
    await this.conexao.comTransacao((cliente) => doacao.incluir(cliente));
    return doacao;
  }
}
