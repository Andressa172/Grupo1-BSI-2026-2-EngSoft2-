// Control - ReceberDoacaoProdutoController (RF_F3 - Receber doação de produto)
// Fluxo: View -> Controller -> Model -> DAO. A rota cria o Controller com `new`; o Controller não
// se auto-instancia nem chama outro Controller: a entrada no estoque (RF_F1) é feita pelo Model.
// O Controller mantém a conexão (Database, Singleton) e controla a transação (tudo grava ou nada grava).
import { Database } from './db/Database';
import {
  DoacaoProduto,
  type DoacaoProdutoAtributos,
  type DoacaoProdutoRegistro,
  type FiltroDoacaoAtributos,
} from './model/DoacaoProduto';
import { FiltroDoacao } from './model/FiltroDoacao';
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
  // conexão com o banco, aberta e mantida pelo Controller
  private readonly conexao: Database;

  constructor() {
    this.conexao = Database.getInstancia();
  }

  /** Consulta com 2 filtros: doador e período. */
  async consultar(dadosFiltro: FiltroDoacaoAtributos = {}): Promise<DoacaoProdutoRegistro[]> {
    const filtro = new FiltroDoacao(dadosFiltro);
    lancarSeTiverErros(filtro.validar());
    return DoacaoProduto.consultar(this.conexao, filtro);
  }

  /** Valida tudo e, numa só transação, grava a doação e dá entrada de cada item no estoque. */
  async registrar(dados: unknown): Promise<DoacaoProduto> {
    const doacao = new DoacaoProduto(comoObjeto(dados));
    lancarSeTiverErros(doacao.validar());
    await this.conexao.comTransacao(async (cliente) => {
      await doacao.incluir(cliente);
      const itens = doacao.getItens();
      for (let i = 0; i < itens.length; i++) {
        await doacao.incluirItem(cliente, itens[i], i);
      }
    });
    return doacao;
  }
}
