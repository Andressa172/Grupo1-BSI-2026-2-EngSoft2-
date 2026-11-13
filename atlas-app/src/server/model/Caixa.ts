// Model - Caixa (RF_F4, RF_F5, RF_F6)
import { ErroValidacao } from '../erros';
import type { MovimentacaoCaixa } from './MovimentacaoCaixa';

export type StatusCaixa = 'ABERTO' | 'FECHADO';

export interface CaixaAtributos {
  id?: number;
  dataAbertura?: string;
  dataFechamento?: string | null;
  saldoFisicoAbertura: number;
  saldoDigitalAbertura: number;
  saldoFisicoFechamento?: number | null;
  saldoDigitalFechamento?: number | null;
  status?: StatusCaixa;
  abertoPor: number;
}

export function paraCentavos(valor: number): number {
  return Math.round(valor * 100);
}

export function deCentavos(centavos: number): number {
  return centavos / 100;
}

export function parseSaldoValido(valor: unknown, campo: string): number {
  if (valor === null || valor === undefined || valor === '') {
    throw new ErroValidacao(`O campo ${campo} é obrigatório.`);
  }
  const numero = typeof valor === 'number' ? valor : Number(valor);
  if (!Number.isFinite(numero) || numero < 0) {
    throw new ErroValidacao(`O campo ${campo} deve ser um valor numérico maior ou igual a zero.`);
  }
  return deCentavos(paraCentavos(numero));
}

export class Caixa {
  private readonly id?: number;
  private readonly dataAbertura?: string;
  private readonly dataFechamento: string | null;
  private readonly saldoFisicoAbertura: number;
  private readonly saldoDigitalAbertura: number;
  private readonly saldoFisicoFechamento: number | null;
  private readonly saldoDigitalFechamento: number | null;
  private readonly status: StatusCaixa;
  private readonly abertoPor: number;

  constructor(atributos: CaixaAtributos) {
    this.id = atributos.id;
    this.dataAbertura = atributos.dataAbertura;
    this.dataFechamento = atributos.dataFechamento ?? null;
    this.saldoFisicoAbertura = atributos.saldoFisicoAbertura;
    this.saldoDigitalAbertura = atributos.saldoDigitalAbertura;
    this.saldoFisicoFechamento = atributos.saldoFisicoFechamento ?? null;
    this.saldoDigitalFechamento = atributos.saldoDigitalFechamento ?? null;
    this.status = atributos.status ?? 'ABERTO';
    this.abertoPor = atributos.abertoPor;
  }

  getId(): number | undefined {
    return this.id;
  }

  getDataAbertura(): string | undefined {
    return this.dataAbertura;
  }

  getDataFechamento(): string | null {
    return this.dataFechamento;
  }

  getSaldoFisicoAbertura(): number {
    return this.saldoFisicoAbertura;
  }

  getSaldoDigitalAbertura(): number {
    return this.saldoDigitalAbertura;
  }

  getSaldoFisicoFechamento(): number | null {
    return this.saldoFisicoFechamento;
  }

  getSaldoDigitalFechamento(): number | null {
    return this.saldoDigitalFechamento;
  }

  getStatus(): StatusCaixa {
    return this.status;
  }

  getAbertoPor(): number {
    return this.abertoPor;
  }

  validarAbertura(): void {
    if (!Number.isFinite(this.saldoFisicoAbertura) || this.saldoFisicoAbertura < 0) {
      throw new ErroValidacao('Saldo físico inicial inválido: informe um valor maior ou igual a zero.');
    }
    if (!Number.isFinite(this.saldoDigitalAbertura) || this.saldoDigitalAbertura < 0) {
      throw new ErroValidacao('Saldo digital inicial inválido: informe um valor maior ou igual a zero.');
    }
    if (!Number.isInteger(this.abertoPor) || this.abertoPor <= 0) {
      throw new ErroValidacao('Funcionário responsável pela abertura inválido.');
    }
  }

  /**
   * Calcula os saldos esperados (físico e digital) somando os saldos de abertura
   * com todas as movimentações registradas no caixa.
   */
  calcularSaldosEsperados(movimentacoes: MovimentacaoCaixa[]): { fisico: number; digital: number } {
    let fisicoCentavos = paraCentavos(this.saldoFisicoAbertura);
    let digitalCentavos = paraCentavos(this.saldoDigitalAbertura);

    for (const mov of movimentacoes) {
      const sinal = mov.getTipo() === 'ENTRADA' ? 1 : -1;
      const valorCentavos = sinal * paraCentavos(mov.getValor());
      if (mov.getFormaPag() === 'FISICO') {
        fisicoCentavos += valorCentavos;
      } else {
        digitalCentavos += valorCentavos;
      }
    }

    return {
      fisico: deCentavos(fisicoCentavos),
      digital: deCentavos(digitalCentavos),
    };
  }

  paraLinhaDeDados() {
    return {
      id: this.id,
      dataAbertura: this.dataAbertura,
      dataFechamento: this.dataFechamento,
      saldoFisicoAbertura: this.saldoFisicoAbertura,
      saldoDigitalAbertura: this.saldoDigitalAbertura,
      saldoFisicoFechamento: this.saldoFisicoFechamento,
      saldoDigitalFechamento: this.saldoDigitalFechamento,
      status: this.status,
      abertoPor: this.abertoPor,
    };
  }
}
