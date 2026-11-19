// Model - Evento (RF_F9 - Alocar Recursos para Eventos)
// Guarda o evento e os recursos alocados, valida tudo e persiste criando o EventoDAO
// com a conexão que recebe do Controller (dentro de uma transação).
import type { ErrosDeCampo } from '../erros';
import { ErroNaoEncontrado, ErroRegraDeNegocio, ErroValidacao } from '../erros';
import type { ExecutorSQL } from '../dao/tipos';
import { EventoDAO, type EventoRegistro } from '../dao/EventoDAO';
import type { FiltroEvento } from './FiltroEvento';
import { AlocacaoRecurso } from './AlocacaoRecurso';
import { MovimentacaoEstoque } from './MovimentacaoEstoque';
import { Caixa } from './Caixa';
import { MovimentacaoCaixa } from './MovimentacaoCaixa';
import { dataValida, hoje, parseData, paraIso, textoSeguro } from './datasBR';

export interface EventoAtributos {
  nome: string;
  data: string; // dd/mm/aaaa
  descricao?: string | null;
  recursos: unknown;
}

const MAXIMO_RECURSOS = 50;

export class Evento {
  private id?: number;
  private readonly nome: string;
  private readonly data: Date;
  private readonly descricao: string | null;
  private readonly recursos: AlocacaoRecurso[];
  private readonly recursosEmFormatoInvalido: boolean;

  constructor(atributos: Partial<EventoAtributos>) {
    this.nome = textoSeguro(atributos.nome);
    this.data = parseData(atributos.data);
    this.descricao = textoSeguro(atributos.descricao) || null;
    this.recursosEmFormatoInvalido = atributos.recursos !== undefined && !Array.isArray(atributos.recursos);
    const recursosBrutos = Array.isArray(atributos.recursos)
      ? atributos.recursos.slice(0, MAXIMO_RECURSOS + 1).map((r) => new AlocacaoRecurso(r))
      : [];
    this.recursos = Evento.somarProdutosRepetidos(recursosBrutos);
  }

  // recursos financeiros nunca são somados (cada um é um lançamento próprio, com sua data); só
  // produtos repetidos (mesmo produtoId) viram uma única linha com a quantidade somada.
  private static somarProdutosRepetidos(recursos: AlocacaoRecurso[]): AlocacaoRecurso[] {
    const somados: AlocacaoRecurso[] = [];
    const indicePorProduto = new Map<number, number>();

    for (const recurso of recursos) {
      if (recurso.getTipo() === 'PRODUTO' && Number.isInteger(recurso.getProdutoId())) {
        const indiceExistente = indicePorProduto.get(recurso.getProdutoId());
        if (indiceExistente !== undefined) {
          const existente = somados[indiceExistente];
          somados[indiceExistente] = new AlocacaoRecurso({
            tipo: 'PRODUTO',
            produtoId: existente.getProdutoId(),
            quantidade: existente.getQuantidade() + recurso.getQuantidade(),
          });
          continue;
        }
        indicePorProduto.set(recurso.getProdutoId(), somados.length);
      }
      somados.push(recurso);
    }

    return somados;
  }

  getId(): number | undefined {
    return this.id;
  }

  getNome(): string {
    return this.nome;
  }

  getData(): Date {
    return this.data;
  }

  getRecursos(): readonly AlocacaoRecurso[] {
    return this.recursos;
  }

  validar(): ErrosDeCampo {
    const erros: ErrosDeCampo = {};

    if (this.nome.length === 0) {
      erros.nome = 'Nome inválido: o nome do evento é obrigatório.';
    } else if (this.nome.length > 120) {
      erros.nome = 'Nome inválido: no máximo 120 caracteres.';
    }

    if (!dataValida(this.data)) {
      erros.data = 'Data inválida: use o formato dd/mm/aaaa.';
    } else if (paraIso(this.data) < paraIso(hoje())) {
      erros.data = 'Data inválida: não é possível cadastrar ou alterar um evento para uma data que já passou.';
    }

    if (this.recursosEmFormatoInvalido || this.recursos.length === 0) {
      erros.recursos = 'Informe ao menos um recurso para o evento.';
    } else if (this.recursos.length > MAXIMO_RECURSOS) {
      erros.recursos = `Um evento pode ter no máximo ${MAXIMO_RECURSOS} recursos.`;
    } else {
      this.recursos.forEach((recurso, i) => {
        const errosRecurso = recurso.validar();
        for (const campo of Object.keys(errosRecurso)) erros[`recurso.${i}.${campo}`] = errosRecurso[campo];
      });
    }

    return erros;
  }

  // ------------------------------ persistência ------------------------------

  /** Grava o evento (os recursos e a saída no estoque, RF_F1, ficam a cargo do Controller). Dentro de uma transação. */
  async incluir(conexao: ExecutorSQL): Promise<void> {
    this.id = await new EventoDAO(conexao).inserirEvento(this.nome, paraIso(this.data), this.descricao);
  }

  /**
   * Atualiza o evento e apaga os recursos antigos. O Controller já estornou o estoque dos
   * recursos antigos (Evento.estornarEstoque) e aloca os novos depois. Deve rodar dentro de uma transação.
   */
  async alterar(conexao: ExecutorSQL, id: number): Promise<void> {
    const dao = new EventoDAO(conexao);
    const dataAtual = await dao.buscarData(id);
    if (dataAtual === null) {
      throw new ErroNaoEncontrado('Evento não encontrado.');
    }
    if (dataAtual < paraIso(hoje())) {
      throw new ErroRegraDeNegocio('Não é possível alterar um evento que já aconteceu.');
    }

    await dao.excluirRecursos(id);
    await dao.atualizarEvento(id, this.nome, paraIso(this.data), this.descricao);
    this.id = id;
  }

  /** Exclui o evento (cascata remove os recursos). O Controller já estornou o estoque. */
  static async excluir(conexao: ExecutorSQL, id: number): Promise<void> {
    const dao = new EventoDAO(conexao);
    const dataAtual = await dao.buscarData(id);
    if (dataAtual === null) {
      throw new ErroNaoEncontrado('Evento não encontrado.');
    }
    if (dataAtual < paraIso(hoje())) {
      throw new ErroRegraDeNegocio('Não é possível excluir um evento que já aconteceu.');
    }
    if (!(await dao.excluirEvento(id))) {
      throw new ErroNaoEncontrado('Evento não encontrado.');
    }
  }

  /** Devolve ao estoque os produtos alocados ao evento (estorno), antes de apagar os recursos antigos. */
  static async estornarEstoque(conexao: ExecutorSQL, eventoId: number): Promise<void> {
    const produtos = await new EventoDAO(conexao).listarProdutosAlocados(eventoId);
    for (const produto of produtos) {
      await new MovimentacaoEstoque({
        produtoId: produto.produtoId,
        tipo: 'ENTRADA',
        quantidade: produto.quantidade,
        origem: `Estorno: evento #${eventoId}`,
      }).aplicar(conexao);
    }
  }

  /** Origem registrada no histórico de estoque para as saídas deste evento. */
  getOrigemEstoque(): string {
    return `Alocação para evento "${this.nome}"`;
  }

  /**
   * Grava um recurso alocado. Se for produto, dá antes a saída no estoque (RF_F1), na mesma
   * transação; sem saldo, nada é gravado.
   */
  async incluirRecurso(conexao: ExecutorSQL, recurso: AlocacaoRecurso, indice: number): Promise<void> {
    if (recurso.getTipo() === 'PRODUTO') {
      const resultado = await new MovimentacaoEstoque({
        produtoId: recurso.getProdutoId(),
        tipo: 'SAIDA',
        quantidade: recurso.getQuantidade(),
        origem: this.getOrigemEstoque(),
      }).aplicar(conexao);
      if (resultado !== 'APLICADA') {
        throw new ErroValidacao('Estoque insuficiente.', {
          [`recurso.${indice}.quantidade`]: 'Estoque insuficiente para a quantidade informada.',
        });
      }
    }
    const recursoId = await new EventoDAO(conexao).inserirRecurso(this.id!, recurso);
    if (recurso.getTipo() === 'FINANCEIRO') {
      await Evento.lancarDespesaSeVencida(conexao, recursoId, this.nome, this.id!, recurso.getValor(), recurso.getDataPagamento());
    }
  }

  /**
   * Lança no caixa aberto a saída referente a uma despesa financeira de evento, se a data de
   * pagamento já chegou (RF_F6, AlocacaoRecurso gera MovimentacaoCaixa). Sem caixa aberto, a
   * despesa fica pendente até alguém abrir o caixa e a tela ser consultada de novo.
   */
  private static async lancarDespesaSeVencida(
    conexao: ExecutorSQL,
    recursoId: number,
    eventoNome: string,
    eventoId: number,
    valor: number,
    dataPagamento: Date
  ): Promise<void> {
    if (!dataValida(dataPagamento) || paraIso(dataPagamento) > paraIso(hoje())) return;
    const caixa = await Caixa.buscarAberto(conexao, true);
    if (!caixa) return;

    const movimentacao = new MovimentacaoCaixa({
      caixaId: caixa.getId() as number,
      tipo: 'SAIDA',
      formaPag: 'DIGITAL',
      valor,
      origem: `Alocação para evento "${eventoNome}" #${eventoId}`,
    });
    movimentacao.validar();
    const salva = await movimentacao.incluir(conexao);
    await new EventoDAO(conexao).marcarRecursoComoPago(recursoId, salva.getId() as number);
  }

  /**
   * Lança no caixa aberto todas as despesas de eventos já vencidas (data de pagamento <= hoje)
   * que ainda não foram pagas - chamado sempre que a tela de Caixa é consultada (RF_F6).
   */
  static async processarDespesasPendentes(conexao: ExecutorSQL): Promise<void> {
    const dao = new EventoDAO(conexao);
    const pendentes = await dao.listarDespesasPendentes(paraIso(hoje()));
    if (pendentes.length === 0) return;
    const caixa = await Caixa.buscarAberto(conexao, true);
    if (!caixa) return;

    for (const despesa of pendentes) {
      const movimentacao = new MovimentacaoCaixa({
        caixaId: caixa.getId() as number,
        tipo: 'SAIDA',
        formaPag: 'DIGITAL',
        valor: despesa.valor,
        origem: `Alocação para evento "${despesa.eventoNome}" #${despesa.eventoId}`,
      });
      movimentacao.validar();
      const salva = await movimentacao.incluir(conexao);
      await dao.marcarRecursoComoPago(despesa.id, salva.getId() as number);
    }
  }

  /** Despesas de eventos ainda pendentes de pagamento, para avisar na tela de Caixa. */
  static async listarDespesasPendentes(conexao: ExecutorSQL) {
    return new EventoDAO(conexao).listarDespesasPendentes();
  }

  static async consultar(conexao: ExecutorSQL, filtro: FiltroEvento): Promise<EventoRegistro[]> {
    return new EventoDAO(conexao).consultar(filtro);
  }
}
