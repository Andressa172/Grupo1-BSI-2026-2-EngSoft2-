// Model - DoacaoDinheiro (RF_F11 - Receber doação em dinheiro)
import type { ErrosDeCampo } from '../erros';
import type { ExecutorSQL } from '../dao/tipos';
import { DoacaoDinheiroDAO, type DoacaoDinheiroRegistro } from '../dao/DoacaoDinheiroDAO';
import type { FiltroDoacao } from './FiltroDoacao';
import { SelecaoDoador } from './SelecaoDoador';
import { Caixa, deCentavos, paraCentavos } from './Caixa';
import { MovimentacaoCaixa } from './MovimentacaoCaixa';
import { dataValida, hoje, paraIso, parseData, parseValor, textoSeguro } from './datasBR';

export type { FiltroDoacaoAtributos } from './FiltroDoacao';
export type { DoacaoDinheiroRegistro } from '../dao/DoacaoDinheiroDAO';
export const FORMAS_RECEBIMENTO = ['Dinheiro', 'PIX', 'Transferência'] as const;
const VALOR_MAXIMO = 1_000_000;

export interface DoacaoDinheiroAtributos {
  doador: unknown;
  valor: string | number; // "1.234,56" ou número
  formaRecebimento: string;
  dataRecebimento: string; // dd/mm/aaaa
}

export class DoacaoDinheiro {
  private id?: number;
  private readonly doador: SelecaoDoador;
  private readonly valor: number;
  private readonly formaRecebimento: string;
  private readonly dataRecebimento: Date;
  // caixa aberto encontrado por validarCaixa (RF_F6): é nele que a entrada será lançada
  private caixa: Caixa | null = null;

  constructor(atributos: Partial<DoacaoDinheiroAtributos>) {
    this.doador = new SelecaoDoador(atributos.doador);
    this.valor = parseValor(atributos.valor);
    this.formaRecebimento = textoSeguro(atributos.formaRecebimento);
    this.dataRecebimento = parseData(atributos.dataRecebimento);
  }

  getId(): number | undefined {
    return this.id;
  }

  getValor(): number {
    return this.valor;
  }

  getFormaRecebimento(): string {
    return this.formaRecebimento;
  }

  /** RF_F11 fluxos 3.1 (valor), 3.2 (forma de recebimento) e 3.3 (data). */
  validar(): ErrosDeCampo {
    const erros: ErrosDeCampo = { ...this.doador.validar() };

    if (!Number.isFinite(this.valor) || this.valor <= 0) {
      erros.valor = 'Valor inválido: informe um valor maior que zero.';
    } else if (this.valor > VALOR_MAXIMO) {
      erros.valor = 'Valor inválido: acima do limite de R$ 1.000.000,00.';
    }
    if (!(FORMAS_RECEBIMENTO as readonly string[]).includes(this.formaRecebimento)) {
      erros.formaRecebimento = 'Forma de recebimento inválida: escolha dinheiro, PIX ou transferência.';
    }
    if (!dataValida(this.dataRecebimento)) {
      erros.dataRecebimento = 'Data de recebimento inválida: use o formato dd/mm/aaaa.';
    } else if (this.dataRecebimento.getTime() > hoje().getTime()) {
      erros.dataRecebimento = 'Data de recebimento inválida: não pode ser uma data futura.';
    }
    return erros;
  }

  // ------------------------------ persistência ------------------------------

  /**
   * Exige caixa aberto no momento da doação (RF_F6) e que a data informada não seja anterior à
   * abertura desse caixa. Trava a linha do caixa até o fim da transação. Chamar dentro de uma transação.
   */
  async validarCaixa(conexao: ExecutorSQL): Promise<ErrosDeCampo> {
    const caixa = await Caixa.buscarAberto(conexao, true);
    if (!caixa) {
      return { caixa: 'Não há caixa aberto: abra o caixa antes de registrar a doação em dinheiro.' };
    }
    const diaAbertura = (caixa.getDataAbertura() ?? '').slice(0, 10); // aaaa-mm-dd
    if (diaAbertura !== '' && paraIso(this.dataRecebimento) < diaAbertura) {
      return { dataRecebimento: 'Data de recebimento anterior à abertura do caixa atual.' };
    }
    this.caixa = caixa;
    return {};
  }

  /** Grava a doação. Chamar dentro de uma transação, depois de validarCaixa. */
  async incluir(conexao: ExecutorSQL): Promise<void> {
    const doadorId = await this.doador.obterId(conexao);
    const dao = new DoacaoDinheiroDAO(conexao);
    this.id = await dao.inserir(doadorId, this.valor, this.formaRecebimento, paraIso(this.dataRecebimento));
  }

  /** RF_F6: lança a entrada no caixa aberto encontrado por validarCaixa (mesma transação da doação). */
  async lancarNoCaixa(conexao: ExecutorSQL): Promise<void> {
    const movimentacao = new MovimentacaoCaixa({
      caixaId: this.caixa!.getId() as number,
      tipo: 'ENTRADA',
      formaPag: this.formaRecebimento === 'Dinheiro' ? 'FISICO' : 'DIGITAL',
      valor: deCentavos(paraCentavos(this.valor)),
      origem: `Doação em dinheiro #${this.id}`,
    });
    movimentacao.validar();
    await movimentacao.incluir(conexao);
  }

  static async consultar(conexao: ExecutorSQL, filtro: FiltroDoacao): Promise<DoacaoDinheiroRegistro[]> {
    return new DoacaoDinheiroDAO(conexao).consultar(filtro);
  }

  paraLinhaDeDados() {
    return {
      id: this.id,
      valor: this.valor,
      formaRecebimento: this.formaRecebimento,
      dataRecebimento: paraIso(this.dataRecebimento),
    };
  }
}
