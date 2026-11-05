import { DoacaoDinheiro } from '@/model/DoacaoDinheiro';
import { FiltroDoacao } from '@/model/FiltroDoacao';
import { type ErrosValidacao, parseDataBR, parseValorBR } from '@/model/validacao';
import type { AtlasGateway } from '@/dao/AtlasGateway';
import { DoadorDAO } from '@/dao/DoadorDAO';
import { DoacaoDinheiroDAO } from '@/dao/DoacaoDinheiroDAO';
import { type SelecaoDoador, obterIdDoador, validarDoador } from './resolverDoador';
import type { DadosFiltroDoacao, OpcaoSelecao, ResultadoRegistro } from './ControlReceberDoacaoProduto';

export interface DadosDoacaoDinheiro {
  doador: SelecaoDoador;
  valor: string;
  formaRecebimento: string;
  dataRecebimento: string;
}

export interface LinhaDoacaoDinheiro {
  id: string;
  doadorId: string;
  data: string;
  doador: string;
  valor: number;
  formaRecebimento: string;
}

/**
 * Control do caso de uso RF_F11 - Receber doação em dinheiro.
 * Singleton + Façade, como o Control de doação de produto.
 */
export class ControlReceberDoacaoDinheiro {
  private static instancia: ControlReceberDoacaoDinheiro | undefined;

  private doadorDAO!: DoadorDAO;
  private doacaoDAO!: DoacaoDinheiroDAO;

  private constructor() {}

  static getInstancia(): ControlReceberDoacaoDinheiro {
    if (!ControlReceberDoacaoDinheiro.instancia) {
      ControlReceberDoacaoDinheiro.instancia = new ControlReceberDoacaoDinheiro();
    }
    return ControlReceberDoacaoDinheiro.instancia;
  }

  configurar(gateway: AtlasGateway): void {
    this.doadorDAO = new DoadorDAO(gateway);
    this.doacaoDAO = new DoacaoDinheiroDAO(gateway);
  }

  listarDoadores(): OpcaoSelecao[] {
    return this.doadorDAO
      .listar()
      .filter((d) => !d.anonimo)
      .map((d) => ({ id: d.id, nome: d.nome }));
  }

  listarDoacoes(): LinhaDoacaoDinheiro[] {
    const doadores = this.doadorDAO.listar();
    return this.doacaoDAO.listar().map((d) => ({
      id: d.id,
      doadorId: d.doadorId,
      data: d.data,
      doador: doadores.find((x) => x.id === d.doadorId)?.nome ?? '—',
      valor: d.valor,
      formaRecebimento: d.formaRecebimento,
    }));
  }

  validarFiltro(dados: DadosFiltroDoacao): ErrosValidacao {
    return new FiltroDoacao(dados.doadorId, dados.dataInicial, dados.dataFinal).validar();
  }

  /** Consulta com 2 filtros: doador e período. */
  consultarDoacoes(dados: DadosFiltroDoacao): LinhaDoacaoDinheiro[] {
    const filtro = new FiltroDoacao(dados.doadorId, dados.dataInicial, dados.dataFinal);
    if (Object.keys(filtro.validar()).length > 0) return [];
    return this.listarDoacoes().filter((d) => filtro.aceita(d.doadorId, d.data));
  }

  /** Passos 1 a 7 do fluxo básico: valida tudo, depois registra a doação (e o caixa). */
  registrar(dados: DadosDoacaoDinheiro): ResultadoRegistro {
    const doacao = new DoacaoDinheiro(
      parseValorBR(dados.valor),
      dados.formaRecebimento,
      parseDataBR(dados.dataRecebimento)
    );

    const erros: ErrosValidacao = { ...validarDoador(dados.doador), ...doacao.validar() };
    if (Object.keys(erros).length > 0) return { sucesso: false, erros };

    const doadorId = obterIdDoador(dados.doador, this.doadorDAO);
    this.doacaoDAO.salvar(doacao, doadorId);
    return { sucesso: true, erros: {} };
  }
}
