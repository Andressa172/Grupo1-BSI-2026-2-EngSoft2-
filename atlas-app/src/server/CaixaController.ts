// Control - CaixaController (RF_F4 Abrir Caixa, RF_F5 Fechar Caixa, RF_F6 Atualizar Caixa)
import { Database } from './db/Database';
import { CaixaDAO } from './dao/CaixaDAO';
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

export interface ICaixaDAO {
  buscarCaixaAberto(paraAtualizacao?: boolean): Promise<Caixa | null>;
  listarTodos(): Promise<Caixa[]>;
  inserir(caixa: Caixa): Promise<Caixa>;
  fechar(id: number, saldoFisicoFinal: number, saldoDigitalFinal: number): Promise<Caixa | null>;
  inserirMovimentacao(movimentacao: MovimentacaoCaixa): Promise<MovimentacaoCaixa>;
  listarMovimentacoesPorCaixa(caixaId: number): Promise<MovimentacaoCaixa[]>;
}

const globalParaSingleton = globalThis as unknown as { caixaController?: CaixaController };

export class CaixaController {
  private constructor(
    private readonly database: Pick<Database, 'comTransacao' | 'query'> = Database.getInstancia(),
    private readonly criarCaixaDAO: (executor: ExecutorSQL) => ICaixaDAO = (executor) => new CaixaDAO(executor)
  ) {}

  static getInstancia(): CaixaController {
    if (!globalParaSingleton.caixaController) {
      globalParaSingleton.caixaController = new CaixaController();
    }
    return globalParaSingleton.caixaController;
  }

  static getInstance(): CaixaController {
    return CaixaController.getInstancia();
  }

  /** Fábrica auxiliar para injeção de dublês em testes unitários sem perder o construtor privado. */
  static criarParaTeste(
    database: Pick<Database, 'comTransacao' | 'query'>,
    criarCaixaDAO: (executor: ExecutorSQL) => ICaixaDAO
  ): CaixaController {
    return new CaixaController(database, criarCaixaDAO);
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
      const dao = this.criarCaixaDAO(client as unknown as ExecutorSQL);
      const caixaExistente = await dao.buscarCaixaAberto(true);
      if (caixaExistente) {
        throw new ErroConflito('Já existe um caixa aberto no momento.');
      }

      const caixaSalvo = await dao.inserir(novoCaixa);
      return caixaSalvo.paraLinhaDeDados();
    });
  }

  /** RF_F5 - Fechar Caixa (apenas Gerente). */
  async fecharCaixa(dados: DadosFecharCaixa, idFuncionario: number) {
    const saldoFisicoFinal = parseSaldoValido(dados.saldoFisicoFinal, 'saldoFisicoFinal');
    const saldoDigitalFinal = parseSaldoValido(dados.saldoDigitalFinal, 'saldoDigitalFinal');

    return this.database.comTransacao(async (client) => {
      const dao = this.criarCaixaDAO(client as unknown as ExecutorSQL);
      const caixaAberto = await dao.buscarCaixaAberto(true);
      if (!caixaAberto || !caixaAberto.getId()) {
        throw new ErroNaoEncontrado('Não há nenhum caixa aberto para fechar.');
      }

      const movimentacoes = await dao.listarMovimentacoesPorCaixa(caixaAberto.getId()!);
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

      const caixaFechado = await dao.fechar(caixaAberto.getId()!, saldoFisicoFinal, saldoDigitalFinal);
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
      const dao = this.criarCaixaDAO(executor);
      const caixaAberto = await dao.buscarCaixaAberto(true);
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
        const movimentacoes = await dao.listarMovimentacoesPorCaixa(caixaAberto.getId()!);
        const saldos = caixaAberto.calcularSaldosEsperados(movimentacoes);
        const saldoDisponivel =
          movimentacao.getFormaPag() === 'FISICO' ? saldos.fisico : saldos.digital;

        if (paraCentavos(saldoDisponivel) < paraCentavos(movimentacao.getValor())) {
          throw new ErroRegraDeNegocio(
            `Saldo ${movimentacao.getFormaPag().toLowerCase()} insuficiente no caixa para esta saída.`
          );
        }
      }

      const salva = await dao.inserirMovimentacao(movimentacao);
      return salva.paraLinhaDeDados();
    };

    if (dbClient) {
      return executar(dbClient);
    }
    return this.database.comTransacao((client) => executar(client as unknown as ExecutorSQL));
  }

  /** Retorna o caixa aberto (com movimentações e saldos) e o histórico de caixas. */
  async obterEstadoAtual() {
    const dao = this.criarCaixaDAO(this.database as unknown as ExecutorSQL);
    const [caixaAberto, todos] = await Promise.all([dao.buscarCaixaAberto(false), dao.listarTodos()]);

    if (!caixaAberto || !caixaAberto.getId()) {
      return {
        caixaAberto: null,
        caixas: todos.map((c) => c.paraLinhaDeDados()),
      };
    }

    const movimentacoes = await dao.listarMovimentacoesPorCaixa(caixaAberto.getId()!);
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
