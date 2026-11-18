// Control - ReceberDoacaoDinheiroController (RF_F11 - Receber doação em dinheiro)
<<<<<<< HEAD
// Instanciado pela camada Service (DoacaoService), com a conexão e a transação
// sob responsabilidade do Controller (mesmo padrão do ReceberDoacaoProdutoController).
=======
// Fluxo: View -> Controller -> Model -> DAO. A rota cria o Controller com `new`; o Controller não
// se auto-instancia nem chama outro Controller: quem fala com o caixa (RF_F6) é o Model.
// O Controller mantém a conexão (Database, Singleton) e controla a transação.
>>>>>>> ff417c4de0e7941ad1f7b899e4d416e5da8847eb
import { Database } from './db/Database';
import {
  DoacaoDinheiro,
  type DoacaoDinheiroAtributos,
  type DoacaoDinheiroRegistro,
  type FiltroDoacaoAtributos,
} from './model/DoacaoDinheiro';
import { FiltroDoacao } from './model/FiltroDoacao';
import { ErroValidacao, type ErrosDeCampo } from './erros';

const MENSAGEM_CAMPOS_INVALIDOS = 'Corrija os campos destacados.';

function lancarSeTiverErros(erros: ErrosDeCampo): void {
  if (Object.keys(erros).length > 0) {
    throw new ErroValidacao(MENSAGEM_CAMPOS_INVALIDOS, erros);
  }
}

function comoObjeto(dados: unknown): Partial<DoacaoDinheiroAtributos> {
  if (typeof dados !== 'object' || dados === null || Array.isArray(dados)) {
    throw new ErroValidacao('Dados inválidos.');
  }
  return dados as Partial<DoacaoDinheiroAtributos>;
}

export class ReceberDoacaoDinheiroController {
<<<<<<< HEAD
  private readonly conexao: Database;

  // Controller do RF_F6, chamado para lançar a entrada no caixa
  private readonly caixa: CaixaController;

  constructor() {
    this.conexao = Database.getInstancia();
    this.caixa = CaixaController.getInstancia();
=======
  // conexão com o banco, aberta e mantida pelo Controller
  private readonly conexao: Database;

  constructor() {
    this.conexao = Database.getInstancia();
>>>>>>> ff417c4de0e7941ad1f7b899e4d416e5da8847eb
  }

  /** Consulta com 2 filtros: doador e período. */
  async consultar(dadosFiltro: FiltroDoacaoAtributos = {}): Promise<DoacaoDinheiroRegistro[]> {
    const filtro = new FiltroDoacao(dadosFiltro);
    lancarSeTiverErros(filtro.validar());
    return DoacaoDinheiro.consultar(this.conexao, filtro);
  }

  /** Valida tudo, exige caixa aberto e, numa só transação, grava a doação e lança a entrada no caixa. */
  async registrar(dados: unknown): Promise<DoacaoDinheiro> {
    const doacao = new DoacaoDinheiro(comoObjeto(dados));
    lancarSeTiverErros(doacao.validar());
    await this.conexao.comTransacao(async (cliente) => {
      lancarSeTiverErros(await doacao.validarCaixa(cliente));
      await doacao.incluir(cliente);
      await doacao.lancarNoCaixa(cliente);
    });
    return doacao;
  }
}
