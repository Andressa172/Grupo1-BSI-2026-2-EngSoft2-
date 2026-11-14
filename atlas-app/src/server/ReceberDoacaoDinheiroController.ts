// Control - ReceberDoacaoDinheiroController (RF_F11 - Receber doação em dinheiro)
// Singleton + Façade, com a conexão e a transação sob responsabilidade do Controller
// (mesmo padrão do ReceberDoacaoProdutoController).
import { Database } from './db/Database';
import { CaixaController } from './CaixaController';
import { DoacaoDinheiro, type DoacaoDinheiroAtributos } from './model/DoacaoDinheiro';
import { FiltroDoacao, type FiltroDoacaoAtributos } from './model/FiltroDoacao';
import type { DoacaoDinheiroRegistro } from './dao/DoacaoDinheiroDAO';
import { ErroCaixaFechado, ErroValidacao, type ErrosDeCampo } from './erros';

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

  // Controller do RF_F6, chamado para lançar a entrada no caixa
  private readonly caixa: CaixaController;

  private constructor() {
    this.conexao = Database.getInstancia();
    this.caixa = CaixaController.getInstancia();
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
    await this.conexao.comTransacao(async (cliente) => {
      await doacao.incluir(cliente);
      try {
        await this.caixa.atualizarCaixa(
          {
            valor: doacao.getValor(),
            tipoMovimentacao: 'ENTRADA',
            formaPag: doacao.getFormaRecebimento() === 'Dinheiro' ? 'FISICO' : 'DIGITAL',
            origem: `Doação em dinheiro #${doacao.getId()}`,
          },
          cliente
        );
        doacao.setCaixaAtualizado(true);
      } catch (erro) {
        // sem caixa aberto a doação continua registrada, só não há onde lançar a entrada
        if (!(erro instanceof ErroCaixaFechado)) throw erro;
        doacao.setCaixaAtualizado(false);
      }
    });
    return doacao;
  }
}
