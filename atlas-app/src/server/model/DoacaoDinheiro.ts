// Model - DoacaoDinheiro (RF_F11 - Receber doação em dinheiro)
import { CaixaController } from '../CaixaController';
import { ErroCaixaFechado, type ErrosDeCampo } from '../erros';
import type { ExecutorSQL } from '../dao/tipos';
import { DoacaoDinheiroDAO, type DoacaoDinheiroRegistro } from '../dao/DoacaoDinheiroDAO';
import type { FiltroDoacao } from './FiltroDoacao';
import { SelecaoDoador } from './SelecaoDoador';
import { dataValida, hoje, paraIso, parseData, parseValor, textoSeguro } from './datasBR';

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
  // true se havia caixa aberto e a entrada foi lançada nele
  private caixaAtualizado = false;

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

  isCaixaAtualizado(): boolean {
    return this.caixaAtualizado;
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

  /** Grava a doação e lança a entrada no caixa aberto (RF_F6), se houver. Chamar dentro de uma transação. */
  async incluir(conexao: ExecutorSQL): Promise<void> {
    const doadorId = await this.doador.obterId(conexao);
    const dao = new DoacaoDinheiroDAO(conexao);
    this.id = await dao.inserir(doadorId, this.valor, this.formaRecebimento, paraIso(this.dataRecebimento));
    try {
      await CaixaController.getInstancia().atualizarCaixa(
        {
          valor: this.valor,
          tipoMovimentacao: 'ENTRADA',
          formaPag: this.formaRecebimento === 'Dinheiro' ? 'FISICO' : 'DIGITAL',
          origem: `Doação em dinheiro #${this.id}`,
        },
        conexao
      );
      this.caixaAtualizado = true;
    } catch (erro) {
      if (erro instanceof ErroCaixaFechado) {
        this.caixaAtualizado = false;
        return;
      }
      throw erro;
    }
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
      caixaAtualizado: this.caixaAtualizado,
    };
  }
}
