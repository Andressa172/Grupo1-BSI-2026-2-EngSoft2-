import { type ErrosValidacao, dataValida, hoje } from './validacao';

export const FORMAS_RECEBIMENTO = ['Dinheiro', 'PIX', 'Transferência'] as const;

/** Entidade DoacaoDinheiro (RF_F11). */
export class DoacaoDinheiro {
  constructor(
    public valor: number,
    public formaRecebimento: string,
    public dataRecebimento: Date
  ) {}

  /** RF_F11 fluxos 3.1 (valor), 3.2 (forma de recebimento) e 3.3 (data). */
  validar(): ErrosValidacao {
    const erros: ErrosValidacao = {};
    if (!Number.isFinite(this.valor) || this.valor <= 0) {
      erros.valor = 'Valor inválido: informe um valor maior que zero.';
    } else if (this.valor > 1_000_000) {
      erros.valor = 'Valor inválido: acima do limite de R$ 1.000.000,00.';
    }
    if (!(FORMAS_RECEBIMENTO as readonly string[]).includes(this.formaRecebimento)) {
      erros.formaRecebimento = 'Forma de recebimento inválida: escolha dinheiro, PIX ou transferência.';
    }
    if (!dataValida(this.dataRecebimento)) {
      erros.dataRecebimento = 'Data de recebimento inválida: use o formato dd/mm/aaaa.';
    } else if (this.dataRecebimento > hoje()) {
      erros.dataRecebimento = 'Data de recebimento inválida: não pode ser uma data futura.';
    }
    return erros;
  }
}
