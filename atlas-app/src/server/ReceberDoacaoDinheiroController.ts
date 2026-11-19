// Control - ReceberDoacaoDinheiroController (RF_F11 - Receber doação em dinheiro)
// Fluxo: View -> Controller -> Model -> DAO.
// - A rota cria o Controller com `new`; ele não se auto-instancia nem chama outro Controller.
// - Abre e mantém a conexão (Database, Singleton) e controla a transação.
// - Cria os Models que o caso de uso precisa (doação, doador, caixa e movimentação do caixa) e
//   decide a ordem. Um Model nunca instancia outro Model e quem cria o DAO é o Model.
import { Database } from './db/Database';
import type { ExecutorSQL } from './dao/tipos';
import {
  DoacaoDinheiro,
  type DoacaoDinheiroAtributos,
  type DoacaoDinheiroRegistro,
  type FiltroDoacaoAtributos,
} from './model/DoacaoDinheiro';
import { FiltroDoacao } from './model/FiltroDoacao';
import { SelecaoDoador } from './model/SelecaoDoador';
import { Doador } from './model/Doador';
import { FiltroDoador } from './model/FiltroDoador';
import { Caixa, deCentavos, paraCentavos } from './model/Caixa';
import { MovimentacaoCaixa } from './model/MovimentacaoCaixa';
import { ErroValidacao, type ErrosDeCampo } from './erros';

const MENSAGEM_CAMPOS_INVALIDOS = 'Corrija os campos destacados.';

function lancarSeTiverErros(erros: ErrosDeCampo): void {
  if (Object.keys(erros).length > 0) {
    throw new ErroValidacao(MENSAGEM_CAMPOS_INVALIDOS, erros);
  }
}

// o corpo da requisição: os dados da doação mais a escolha do doador
type CorpoDoacao = Partial<DoacaoDinheiroAtributos> & { doador?: unknown };

function comoObjeto(dados: unknown): CorpoDoacao {
  if (typeof dados !== 'object' || dados === null || Array.isArray(dados)) {
    throw new ErroValidacao('Dados inválidos.');
  }
  return dados as CorpoDoacao;
}

export class ReceberDoacaoDinheiroController {
  // conexão com o banco, aberta e mantida pelo Controller
  private readonly conexao: Database;

  constructor() {
    this.conexao = Database.getInstancia();
  }

  /** Consulta com 2 filtros: doador (inclui "anônimo") e período. */
  async consultar(dadosFiltro: FiltroDoacaoAtributos = {}): Promise<DoacaoDinheiroRegistro[]> {
    const filtro = new FiltroDoacao(dadosFiltro);
    lancarSeTiverErros(filtro.validar());
    return DoacaoDinheiro.consultar(this.conexao, filtro);
  }

  /** Valida tudo, exige caixa aberto e, numa só transação, grava a doação e lança a entrada no caixa. */
  async registrar(dados: unknown): Promise<DoacaoDinheiro> {
    const corpo = comoObjeto(dados);
    const doacao = new DoacaoDinheiro(corpo);
    const selecao = new SelecaoDoador(corpo.doador);
    const novo = selecao.isNovo() ? new Doador(selecao.getDadosNovoDoador()) : null;
    lancarSeTiverErros({ ...selecao.validar(novo?.validar()), ...doacao.validar() });

    await this.conexao.comTransacao(async (cliente) => {
      // RF_F6: precisa haver caixa aberto agora (a linha fica travada até o fim da transação)
      const caixa = await Caixa.buscarAberto(cliente, true);
      lancarSeTiverErros(doacao.validarCaixa(caixa ? (caixa.getDataAbertura() ?? '') : null));

      const doadorId = await this.obterDoadorId(cliente, selecao, novo);
      await doacao.incluir(cliente, doadorId);

      // entrada no caixa aberto; o valor passa por centavos para não acumular erro de ponto flutuante
      const entrada = new MovimentacaoCaixa({
        caixaId: (caixa as Caixa).getId() as number,
        tipo: 'ENTRADA',
        formaPag: doacao.getFormaPagCaixa(),
        valor: deCentavos(paraCentavos(doacao.getValor())),
        origem: `Doação em dinheiro #${doacao.getId()}`,
      });
      entrada.validar();
      await entrada.incluir(cliente);
    });
    return doacao;
  }

  /**
   * Passos 1 e 2 e fluxo 1.1: descobre o id do doador. O Controller cria e usa o Model Doador
   * (existente, anônimo ou novo) e passa só o id para a doação.
   */
  private async obterDoadorId(cliente: ExecutorSQL, selecao: SelecaoDoador, novo: Doador | null): Promise<number> {
    if (novo) {
      // nome repetido é permitido; quem identifica o doador é o CPF/CNPJ
      const duplicado = new ErroValidacao('Doador já cadastrado.', {
        'doador.cpfCnpj': 'CPF/CNPJ já cadastrado: escolha o doador na lista de existentes.',
      });
      if (await novo.existeComMesmoCpfCnpj(cliente)) throw duplicado;
      try {
        await novo.incluir(cliente);
      } catch (erro) {
        // duas doações ao mesmo tempo com o mesmo CPF/CNPJ: o índice único do banco barra a segunda
        if ((erro as { code?: string }).code === '23505') throw duplicado;
        throw erro;
      }
      return novo.getId() as number;
    }

    if (selecao.isAnonimo()) {
      const todos = await Doador.consultar(cliente, new FiltroDoador());
      const anonimo = todos.find((d) => d.isAnonimo()) ?? new Doador({ nome: 'Doador Anônimo', anonimo: true });
      if (anonimo.getId() === undefined) await anonimo.incluir(cliente);
      return anonimo.getId() as number;
    }

    const existente = await Doador.buscarPorId(cliente, selecao.getId());
    if (!existente) throw new ErroValidacao('Doador inválido.', { doador: 'Doador inválido: não cadastrado.' });
    return existente.getId() as number;
  }
}
