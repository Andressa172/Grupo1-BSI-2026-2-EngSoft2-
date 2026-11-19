// Control - ReceberDoacaoProdutoController (RF_F3 - Receber doação de produto)
// Fluxo: View -> Controller -> Model -> DAO.
// - A rota cria o Controller com `new`; ele não se auto-instancia nem chama outro Controller.
// - Abre e mantém a conexão (Database, Singleton) e controla a transação (tudo grava ou nada grava).
// - Cria os Models que o caso de uso precisa (doação, doador, produto e movimentação de estoque) e
//   decide a ordem (inclusive os itens da doação). Um Model nunca instancia outro Model e quem cria o DAO é o Model.
// - A entrada no estoque (RF_F1) segue os mesmos passos do AtualizarEstoqueController, feitos aqui
//   com os Models, sem chamar aquele Controller.
import { Database } from './db/Database';
import type { ExecutorSQL } from './dao/tipos';
import {
  DoacaoProduto,
  MAXIMO_ITENS,
  type DoacaoProdutoAtributos,
  type DoacaoProdutoRegistro,
  type FiltroDoacaoAtributos,
} from './model/DoacaoProduto';
import { FiltroDoacao } from './model/FiltroDoacao';
import { ItemDoacao } from './model/ItemDoacao';
import { SelecaoDoador } from './model/SelecaoDoador';
import { Doador } from './model/Doador';
import { FiltroDoador } from './model/FiltroDoador';
import { Produto } from './model/Produto';
import { MovimentacaoEstoque } from './model/MovimentacaoEstoque';
import { ErroValidacao, type ErrosDeCampo } from './erros';

const MENSAGEM_CAMPOS_INVALIDOS = 'Corrija os campos destacados.';

function lancarSeTiverErros(erros: ErrosDeCampo): void {
  if (Object.keys(erros).length > 0) {
    throw new ErroValidacao(MENSAGEM_CAMPOS_INVALIDOS, erros);
  }
}

// o corpo da requisição: os dados da doação mais a escolha do doador
type CorpoDoacao = Partial<DoacaoProdutoAtributos> & { doador?: unknown };

function comoObjeto(dados: unknown): CorpoDoacao {
  if (typeof dados !== 'object' || dados === null || Array.isArray(dados)) {
    throw new ErroValidacao('Dados inválidos.');
  }
  return dados as CorpoDoacao;
}

export class ReceberDoacaoProdutoController {
  // conexão com o banco, aberta e mantida pelo Controller
  private readonly conexao: Database;

  constructor() {
    this.conexao = Database.getInstancia();
  }

  /** Consulta com 2 filtros: doador (inclui "anônimo") e período. */
  async consultar(dadosFiltro: FiltroDoacaoAtributos = {}): Promise<DoacaoProdutoRegistro[]> {
    const filtro = new FiltroDoacao(dadosFiltro);
    lancarSeTiverErros(filtro.validar());
    return DoacaoProduto.consultar(this.conexao, filtro);
  }

  /** Valida tudo e, numa só transação, grava a doação e dá entrada de cada item no estoque. */
  async registrar(dados: unknown): Promise<DoacaoProduto> {
    const corpo = comoObjeto(dados);
    // o Controller cria os itens; o limite evita processar listas gigantes (a doação acusa o excesso)
    const itens = Array.isArray(corpo.itens) ? corpo.itens.slice(0, MAXIMO_ITENS + 1).map((i) => new ItemDoacao(i)) : [];
    const doacao = new DoacaoProduto(corpo, itens);
    const selecao = new SelecaoDoador(corpo.doador);
    const novo = selecao.isNovo() ? new Doador(selecao.getDadosNovoDoador()) : null;
    lancarSeTiverErros({ ...selecao.validar(novo?.validar()), ...doacao.validar() });

    await this.conexao.comTransacao(async (cliente) => {
      const doadorId = await this.obterDoadorId(cliente, selecao, novo);
      await doacao.incluir(cliente, doadorId);

      const itens = doacao.getItens();
      for (let i = 0; i < itens.length; i++) {
        const item = itens[i];

        // RF_F1: nova quantidade do produto (a linha fica travada até o fim da transação)
        const produto = new Produto({ id: item.getProdutoId(), nome: '', categoria: '', unidadeMedida: '' });
        if (!(await produto.carregarParaAtualizarEstoque(cliente))) {
          throw new ErroValidacao('Produto inválido.', { [`item.${i}.produto`]: 'Produto inválido: não cadastrado.' });
        }
        const movimentacao = new MovimentacaoEstoque({
          produtoId: item.getProdutoId(),
          tipo: 'ENTRADA',
          quantidade: item.getQuantidade(),
          origem: `Doação de produto #${doacao.getId()}`,
          dataValidade: item.getDataValidade(),
        });
        produto.atualizQuantidade(movimentacao.getQuantidade(), 'ENTRADA', movimentacao.getDataValidadeIso());
        await produto.salvarEstoque(cliente);
        await movimentacao.registrar(cliente);

        await doacao.incluirItem(cliente, item);
      }
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
