// Control - CaixaController (RF_F4 Abrir Caixa, RF_F5 Fechar Caixa, RF_F6 Atualizar Caixa)
import { Database } from './db/Database';
import type { ExecutorSQL } from './dao/tipos';
import { Caixa, deCentavos, paraCentavos, parseSaldoValido } from './model/Caixa';
import {
  MovimentacaoCaixa,
  type FormaPagamentoCaixa,
  type TipoMovimentacaoCaixa,
} from './model/MovimentacaoCaixa';
import {
  ErroCaixaFechado,
  ErroConflito,
  ErroDivergenciaCaixa,
  ErroNaoEncontrado,
  ErroRegraDeNegocio,
  ErroValidacao,
} from './erros';

export interface DadosAbrirCaixa {
  saldoFisicoInicial: unknown;
  saldoDigitalInicial: unknown;
}

export interface DadosFecharCaixa {
  saldoFisicoFinal: unknown;
  saldoDigitalFinal: unknown;
  confirmarComRessalva?: boolean;
  justificativa?: string | null;
}

export interface DadosAtualizarCaixa {
  valor: number;
  tipoMovimentacao: TipoMovimentacaoCaixa;
  formaPag: FormaPagamentoCaixa;
  origem?: string;
}

export class CaixaController {
  private static instancia: CaixaController | undefined;

  private constructor(private readonly database: Pick<Database, 'comTransacao' | 'query'> = Database.getInstancia()) {}

  static getInstancia(): CaixaController {
    if (!CaixaController.instancia) {
      CaixaController.instancia = new CaixaController();
    }
    return CaixaController.instancia;
  }

  static getInstance(): CaixaController {
    return CaixaController.getInstancia();
  }

  /** Fábrica auxiliar para injeção de uma conexão falsa em testes unitários sem perder o construtor privado. */
  static criarParaTeste(database: Pick<Database, 'comTransacao' | 'query'>): CaixaController {
    return new CaixaController(database);
  }

  /** RF_F4 - Abrir Caixa (apenas Gerente). */
  async abrirCaixa(dados: DadosAbrirCaixa, idFuncionario: number) {
    const saldoFisicoInicial = parseSaldoValido(dados.saldoFisicoInicial, 'saldoFisicoInicial');
    const saldoDigitalInicial = parseSaldoValido(dados.saldoDigitalInicial, 'saldoDigitalInicial');

    const novoCaixa = new Caixa({
      saldoFisicoAbertura: saldoFisicoInicial,
      saldoDigitalAbertura: saldoDigitalInicial,
      status: 'ABERTO',
      abertoPor: idFuncionario,
    });
    novoCaixa.validarAbertura();

    return this.database.comTransacao(async (client) => {
      const conexao = client as unknown as ExecutorSQL;
      const caixaExistente = await Caixa.buscarAberto(conexao, true);
      if (caixaExistente) {
        throw new ErroConflito('Já existe um caixa aberto no momento.');
      }

      const caixaSalvo = await novoCaixa.incluir(conexao);
      return caixaSalvo.paraLinhaDeDados();
    });
  }

  /** RF_F5 - Fechar Caixa (apenas Gerente). */
  async fecharCaixa(dados: DadosFecharCaixa, idFuncionario: number) {
    const saldoFisicoFinal = parseSaldoValido(dados.saldoFisicoFinal, 'saldoFisicoFinal');
    const saldoDigitalFinal = parseSaldoValido(dados.saldoDigitalFinal, 'saldoDigitalFinal');

    return this.database.comTransacao(async (client) => {
      const conexao = client as unknown as ExecutorSQL;
      const caixaAberto = await Caixa.buscarAberto(conexao, true);
      if (!caixaAberto || !caixaAberto.getId()) {
        throw new ErroNaoEncontrado('Não há nenhum caixa aberto para fechar.');
      }

      const movimentacoes = await caixaAberto.listarMovimentacoes(conexao);
      const esperados = caixaAberto.calcularSaldosEsperados(movimentacoes);

      const diferencaFisico = deCentavos(paraCentavos(saldoFisicoFinal) - paraCentavos(esperados.fisico));
      const diferencaDigital = deCentavos(paraCentavos(saldoDigitalFinal) - paraCentavos(esperados.digital));
      const haDivergencia = diferencaFisico !== 0 || diferencaDigital !== 0;

      const justificativaLimpa = dados.justificativa?.trim() ?? '';
      if (haDivergencia && (!dados.confirmarComRessalva || !justificativaLimpa)) {
        throw new ErroDivergenciaCaixa(
          'Divergência detectada entre os saldos esperados e os saldos informados. Reconte ou confirme com ressalva e justificativa.',
          {
            esperado: esperados,
            informado: { fisico: saldoFisicoFinal, digital: saldoDigitalFinal },
            diferenca: { fisico: diferencaFisico, digital: diferencaDigital },
            requerConfirmacaoRessalva: true,
          }
        );
      }

      const caixaFechado = await caixaAberto.fechar(conexao, saldoFisicoFinal, saldoDigitalFinal);
      if (!caixaFechado) {
        throw new ErroNaoEncontrado('Não foi possível localizar o caixa aberto para fechamento.');
      }

      if (haDivergencia) {
        console.info(
          `[Caixa #${caixaAberto.getId()}] Fechamento com ressalva pelo gerente #${idFuncionario}: ${justificativaLimpa}`
        );
      }

      return {
        caixa: caixaFechado.paraLinhaDeDados(),
        consolidado: {
          esperado: esperados,
          informado: { fisico: saldoFisicoFinal, digital: saldoDigitalFinal },
          diferenca: { fisico: diferencaFisico, digital: diferencaDigital },
          comRessalva: haDivergencia,
          justificativa: haDivergencia ? justificativaLimpa : null,
          fechadoPor: idFuncionario,
        },
      };
    });
  }

  /**
   * RF_F6 - Atualizar Caixa (<<include>> reutilizável por outros casos de uso).
   * Se `dbClient` for informado, participa da transação ACID do chamador.
   */
  async atualizarCaixa(dados: DadosAtualizarCaixa, dbClient?: ExecutorSQL) {
    const executar = async (executor: ExecutorSQL) => {
      const caixaAberto = await Caixa.buscarAberto(executor, true);
      if (!caixaAberto || !caixaAberto.getId()) {
        throw new ErroCaixaFechado('Não é possível registrar movimentação: o caixa está fechado.');
      }

      const valorNumero = typeof dados.valor === 'number' ? dados.valor : Number(dados.valor);
      if (!Number.isFinite(valorNumero) || valorNumero <= 0) {
        throw new ErroValidacao('O valor da movimentação deve ser maior que zero.');
      }

      const movimentacao = new MovimentacaoCaixa({
        caixaId: caixaAberto.getId()!,
        tipo: dados.tipoMovimentacao,
        formaPag: dados.formaPag,
        valor: deCentavos(paraCentavos(valorNumero)),
        origem: dados.origem,
      });
      movimentacao.validar();

      if (movimentacao.getTipo() === 'SAIDA') {
        const movimentacoes = await caixaAberto.listarMovimentacoes(executor);
        const saldos = caixaAberto.calcularSaldosEsperados(movimentacoes);
        const saldoDisponivel =
          movimentacao.getFormaPag() === 'FISICO' ? saldos.fisico : saldos.digital;

        if (paraCentavos(saldoDisponivel) < paraCentavos(movimentacao.getValor())) {
          throw new ErroRegraDeNegocio(
            `Saldo ${movimentacao.getFormaPag().toLowerCase()} insuficiente no caixa para esta saída.`
          );
        }
      }

      const salva = await movimentacao.incluir(executor);
      return salva.paraLinhaDeDados();
    };

    if (dbClient) {
      return executar(dbClient);
    }
    return this.database.comTransacao((client) => executar(client as unknown as ExecutorSQL));
  }

  /** Retorna o caixa aberto (com movimentações e saldos) e o histórico de caixas. */
  async obterEstadoAtual() {
    const conexao = this.database as unknown as ExecutorSQL;
    const [caixaAberto, todos] = await Promise.all([Caixa.buscarAberto(conexao, false), Caixa.listarTodos(conexao)]);

    if (!caixaAberto || !caixaAberto.getId()) {
      return {
        caixaAberto: null,
        caixas: todos.map((c) => c.paraLinhaDeDados()),
      };
    }

    const movimentacoes = await caixaAberto.listarMovimentacoes(conexao);
    const saldosAtuais = caixaAberto.calcularSaldosEsperados(movimentacoes);

    return {
      caixaAberto: {
        ...caixaAberto.paraLinhaDeDados(),
        movimentacoes: movimentacoes.map((m) => m.paraLinhaDeDados()),
        saldosAtuais,
      },
      caixas: todos.map((c) => c.paraLinhaDeDados()),
    };
  }
}
