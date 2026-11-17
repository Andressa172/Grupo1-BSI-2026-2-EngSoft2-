// Control - ReceberDoacaoDinheiroController (RF_F11 - Receber doação em dinheiro)
// Fluxo: View -> Controller -> Model -> DAO. A rota cria o Controller com `new`; o Controller não
// se auto-instancia nem chama outro Controller: quem fala com o caixa (RF_F6) é este Controller,
// criando os Models Caixa e MovimentacaoCaixa (nenhum Model chama outro Model).
// O Controller mantém a conexão (Database, Singleton) e controla a transação.
import { Database } from './db/Database';
import {
  DoacaoDinheiro,
  type DoacaoDinheiroAtributos,
  type DoacaoDinheiroRegistro,
  type FiltroDoacaoAtributos,
} from './model/DoacaoDinheiro';
import { Caixa, deCentavos, paraCentavos } from './model/Caixa';
import { MovimentacaoCaixa } from './model/MovimentacaoCaixa';
import type { ExecutorSQL } from './dao/tipos';
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
  // conexão com o banco, aberta e mantida pelo Controller
  private readonly conexao: Database;

  constructor() {
    this.conexao = Database.getInstancia();
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
      const caixa = await this.exigirCaixaAberto(cliente, doacao);
      await doacao.incluir(cliente);
      await this.lancarNoCaixa(cliente, caixa, doacao);
    });
    return doacao;
  }

  /**
   * Exige caixa aberto no momento da doação (RF_F6) e que a data informada não seja anterior à
   * abertura desse caixa. Trava a linha do caixa até o fim da transação.
   */
  private async exigirCaixaAberto(cliente: ExecutorSQL, doacao: DoacaoDinheiro): Promise<Caixa> {
    const caixa = await Caixa.buscarAberto(cliente, true);
    if (!caixa) {
      lancarSeTiverErros({ caixa: 'Não há caixa aberto: abra o caixa antes de registrar a doação em dinheiro.' });
    }
    const diaAbertura = (caixa!.getDataAbertura() ?? '').slice(0, 10); // aaaa-mm-dd
    if (diaAbertura !== '' && doacao.getDataRecebimentoIso() < diaAbertura) {
      lancarSeTiverErros({ dataRecebimento: 'Data de recebimento anterior à abertura do caixa atual.' });
    }
    return caixa!;
  }

  /** RF_F6: lança a entrada no caixa aberto (mesma transação da doação). */
  private async lancarNoCaixa(cliente: ExecutorSQL, caixa: Caixa, doacao: DoacaoDinheiro): Promise<void> {
    const movimentacao = new MovimentacaoCaixa({
      caixaId: caixa.getId() as number,
      tipo: 'ENTRADA',
      formaPag: doacao.getFormaRecebimento() === 'Dinheiro' ? 'FISICO' : 'DIGITAL',
      valor: deCentavos(paraCentavos(doacao.getValor())),
      origem: `Doação em dinheiro #${doacao.getId()}`,
    });
    movimentacao.validar();
    await movimentacao.incluir(cliente);
  }
}
