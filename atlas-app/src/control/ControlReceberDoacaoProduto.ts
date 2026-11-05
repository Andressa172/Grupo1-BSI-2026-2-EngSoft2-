import { DoacaoProduto } from '@/model/DoacaoProduto';
import { ItemDoacao } from '@/model/ItemDoacao';
import { type ErrosValidacao, parseDataBR } from '@/model/validacao';
import type { AtlasGateway } from '@/dao/AtlasGateway';
import { DoadorDAO } from '@/dao/DoadorDAO';
import { ProdutoDAO } from '@/dao/ProdutoDAO';
import { DoacaoProdutoDAO } from '@/dao/DoacaoProdutoDAO';
import { type SelecaoDoador, obterIdDoador, validarDoador } from './resolverDoador';

/** Dados exatamente como a View recebeu do formulário (tudo texto). */
export interface DadosDoacaoProduto {
  doador: SelecaoDoador;
  dataRecebimento: string;
  itens: { produtoId: string; quantidade: string; dataValidade: string }[];
}

export interface ResultadoRegistro {
  sucesso: boolean;
  erros: ErrosValidacao;
}

export interface OpcaoSelecao {
  id: string;
  nome: string;
}

export interface LinhaDoacaoProduto {
  id: string;
  data: string;
  doador: string;
  itens: { produto: string; quantidade: number }[];
}

/**
 * Control do caso de uso RF_F3 - Receber doação de produto.
 *
 * - Singleton: existe uma única instância durante a execução (getInstancia).
 * - Façade: a View conhece só estes métodos; instanciar Models, validar e
 *   chamar as DAOs é responsabilidade interna do Control (GRASP Controller).
 */
export class ControlReceberDoacaoProduto {
  private static instancia: ControlReceberDoacaoProduto | undefined;

  private doadorDAO!: DoadorDAO;
  private produtoDAO!: ProdutoDAO;
  private doacaoDAO!: DoacaoProdutoDAO;

  private constructor() {}

  static getInstancia(): ControlReceberDoacaoProduto {
    if (!ControlReceberDoacaoProduto.instancia) {
      ControlReceberDoacaoProduto.instancia = new ControlReceberDoacaoProduto();
    }
    return ControlReceberDoacaoProduto.instancia;
  }

  /** Liga o Control à fonte de dados atual (chamado pela View a cada renderização). */
  configurar(gateway: AtlasGateway): void {
    this.doadorDAO = new DoadorDAO(gateway);
    this.produtoDAO = new ProdutoDAO(gateway);
    this.doacaoDAO = new DoacaoProdutoDAO(gateway);
  }

  listarDoadores(): OpcaoSelecao[] {
    return this.doadorDAO
      .listar()
      .filter((d) => !d.anonimo)
      .map((d) => ({ id: d.id, nome: d.nome }));
  }

  listarProdutos(): OpcaoSelecao[] {
    return this.produtoDAO.listar().map((p) => ({ id: p.id, nome: p.nome }));
  }

  listarDoacoes(): LinhaDoacaoProduto[] {
    const doadores = this.doadorDAO.listar();
    const produtos = this.produtoDAO.listar();
    return this.doacaoDAO.listar().map((d) => ({
      id: d.id,
      data: d.data,
      doador: doadores.find((x) => x.id === d.doadorId)?.nome ?? '—',
      itens: d.itens.map((i) => ({
        produto: produtos.find((p) => p.id === i.produtoId)?.nome ?? i.produtoId,
        quantidade: i.quantidade,
      })),
    }));
  }

  /** Passos 1 a 9 do fluxo básico: valida tudo, depois registra a doação (e o estoque). */
  registrar(dados: DadosDoacaoProduto): ResultadoRegistro {
    const doacao = new DoacaoProduto(parseDataBR(dados.dataRecebimento));
    for (const i of dados.itens) {
      const validade = i.dataValidade.trim() === '' ? undefined : parseDataBR(i.dataValidade);
      const quantidade = i.quantidade.trim() === '' ? NaN : Number(i.quantidade);
      doacao.adicionarItem(new ItemDoacao(i.produtoId, quantidade, validade));
    }

    const erros: ErrosValidacao = {
      ...validarDoador(dados.doador),
      ...doacao.validar(this.produtoDAO.listar().map((p) => p.id)),
    };
    if (Object.keys(erros).length > 0) return { sucesso: false, erros };

    const doadorId = obterIdDoador(dados.doador, this.doadorDAO);
    this.doacaoDAO.salvar(doacao, doadorId);
    return { sucesso: true, erros: {} };
  }
}
