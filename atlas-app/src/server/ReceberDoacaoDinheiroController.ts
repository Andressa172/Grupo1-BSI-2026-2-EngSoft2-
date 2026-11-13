// Control - ReceberDoacaoDinheiroController (RF_F11 - Receber doação em dinheiro)
// Singleton + Façade, com a conexão e a transação sob responsabilidade do Controller
// (mesmo padrão do ReceberDoacaoProdutoController).
import { Database } from './db/Database';
import { DoacaoDinheiro, type DoacaoDinheiroAtributos } from './model/DoacaoDinheiro';
import { FiltroDoacao, type FiltroDoacaoAtributos } from './model/FiltroDoacao';
import type { DoacaoDinheiroRegistro } from './dao/DoacaoDinheiroDAO';
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
  private static instancia: ReceberDoacaoDinheiroController | undefined;

  private readonly conexao: Database;

  private constructor() {
    this.conexao = Database.getInstancia();
  }

  static getInstancia(): ReceberDoacaoDinheiroController {
    if (!ReceberDoacaoDinheiroController.instancia) {
      ReceberDoacaoDinheiroController.instancia = new ReceberDoacaoDinheiroController();
    }
    return ReceberDoacaoDinheiroController.instancia;
  }

  /** Consulta com 2 filtros: doador e período. */
  async consultar(dadosFiltro: FiltroDoacaoAtributos = {}): Promise<DoacaoDinheiroRegistro[]> {
    const filtro = new FiltroDoacao(dadosFiltro);
    lancarSeTiverErros(filtro.validar());
    return DoacaoDinheiro.consultar(this.conexao, filtro);
  }

  /** Passos 1 a 7 do fluxo básico: valida tudo e só então registra a doação e lança a entrada no caixa. */
  async registrar(dados: unknown): Promise<DoacaoDinheiro> {
    const doacao = new DoacaoDinheiro(comoObjeto(dados));
    lancarSeTiverErros(doacao.validar());
    await this.conexao.comTransacao((cliente) => doacao.incluir(cliente));
    return doacao;
  }
}
