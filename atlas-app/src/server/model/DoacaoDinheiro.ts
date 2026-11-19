// Model - DoacaoDinheiro (RF_F11 - Receber doação em dinheiro)
import type { ErrosDeCampo } from '../erros';
import type { ExecutorSQL } from '../dao/tipos';
import { DoacaoDinheiroDAO, type DoacaoDinheiroRegistro } from '../dao/DoacaoDinheiroDAO';
import type { FiltroDoacao } from './FiltroDoacao';
import { dataValida, hoje, paraIso, parseData, parseValor, textoSeguro } from './datasBR';

export type { FiltroDoacaoAtributos } from './FiltroDoacao';
export type { DoacaoDinheiroRegistro } from '../dao/DoacaoDinheiroDAO';
export const FORMAS_RECEBIMENTO = ['Dinheiro', 'PIX', 'Transferência'] as const;
const VALOR_MAXIMO = 1_000_000;

export interface DoacaoDinheiroAtributos {
  valor: string | number; // "1.234,56" ou número
  formaRecebimento: string;
  dataRecebimento: string; // dd/mm/aaaa
}

export class DoacaoDinheiro {
  private id?: number;
  private readonly valor: number;
  private readonly formaRecebimento: string;
  private readonly dataRecebimento: Date;

  constructor(atributos: Partial<DoacaoDinheiroAtributos>) {
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
    const erros: ErrosDeCampo = {};

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

  // ------------------------------ caixa (RF_F6) ------------------------------

  getDataRecebimentoIso(): string {
    return paraIso(this.dataRecebimento);
  }

  /** RF_F6: dinheiro em espécie entra no caixa físico; PIX e transferência, no digital. */
  getFormaPagCaixa(): 'FISICO' | 'DIGITAL' {
    return this.formaRecebimento === 'Dinheiro' ? 'FISICO' : 'DIGITAL';
  }

  /**
   * Exige caixa aberto no momento da doação (RF_F6) e que a data informada não seja anterior à
   * abertura desse caixa. O Controller busca o caixa e entrega só a data de abertura
   * (null = não há caixa aberto); este Model apenas decide.
   */
  validarCaixa(dataAberturaCaixa: string | null): ErrosDeCampo {
    if (dataAberturaCaixa === null) {
      return { caixa: 'Não há caixa aberto: abra o caixa antes de registrar a doação em dinheiro.' };
    }
    const diaAbertura = dataAberturaCaixa.slice(0, 10); // aaaa-mm-dd
    if (diaAbertura !== '' && this.getDataRecebimentoIso() < diaAbertura) {
      return { dataRecebimento: 'Data de recebimento anterior à abertura do caixa atual.' };
    }
    return {};
  }

  // ------------------------------ persistência ------------------------------

  /** Grava a doação do doador já resolvido pelo Controller. Chamar dentro de uma transação. */
  async incluir(conexao: ExecutorSQL, doadorId: number): Promise<void> {
    const dao = new DoacaoDinheiroDAO(conexao);
    this.id = await dao.inserir(doadorId, this.valor, this.formaRecebimento, this.getDataRecebimentoIso());
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
