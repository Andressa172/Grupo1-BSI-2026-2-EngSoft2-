// Model - MovimentacaoCaixa (RF_F6)
import { ErroValidacao } from '../erros';

export type TipoMovimentacaoCaixa = 'ENTRADA' | 'SAIDA';
export type FormaPagamentoCaixa = 'FISICO' | 'DIGITAL';

export interface MovimentacaoCaixaAtributos {
  id?: number;
  caixaId: number;
  tipo: TipoMovimentacaoCaixa;
  formaPag: FormaPagamentoCaixa;
  valor: number;
  origem?: string;
  data?: string;
}

export class MovimentacaoCaixa {
  private readonly id?: number;
  private readonly caixaId: number;
  private readonly tipo: TipoMovimentacaoCaixa;
  private readonly formaPag: FormaPagamentoCaixa;
  private readonly valor: number;
  private readonly origem: string;
  private readonly data?: string;

  constructor(atributos: MovimentacaoCaixaAtributos) {
    this.id = atributos.id;
    this.caixaId = atributos.caixaId;
    this.tipo = atributos.tipo;
    this.formaPag = atributos.formaPag;
    this.valor = typeof atributos.valor === 'number' ? atributos.valor : Number(atributos.valor);
    this.origem = atributos.origem?.trim() || 'Movimentação de caixa';
    this.data = atributos.data;
  }

  getId(): number | undefined {
    return this.id;
  }

  getCaixaId(): number {
    return this.caixaId;
  }

  getTipo(): TipoMovimentacaoCaixa {
    return this.tipo;
  }

  getFormaPag(): FormaPagamentoCaixa {
    return this.formaPag;
  }

  getValor(): number {
    return this.valor;
  }

  getOrigem(): string {
    return this.origem;
  }

  getData(): string | undefined {
    return this.data;
  }

  validar(): void {
    if (!Number.isInteger(this.caixaId) || this.caixaId <= 0) {
      throw new ErroValidacao('Identificador do caixa inválido.');
    }
    if (this.tipo !== 'ENTRADA' && this.tipo !== 'SAIDA') {
      throw new ErroValidacao('Tipo de movimentação inválido: utilize ENTRADA ou SAIDA.');
    }
    if (this.formaPag !== 'FISICO' && this.formaPag !== 'DIGITAL') {
      throw new ErroValidacao('Forma de pagamento inválida: utilize FISICO ou DIGITAL.');
    }
    if (!Number.isFinite(this.valor) || this.valor <= 0) {
      throw new ErroValidacao('O valor da movimentação deve ser maior que zero.');
    }
    if (!this.origem) {
      throw new ErroValidacao('Informe a origem da movimentação.');
    }
  }

  paraLinhaDeDados() {
    return {
      id: this.id,
      caixaId: this.caixaId,
      tipo: this.tipo,
      formaPag: this.formaPag,
      valor: this.valor,
      origem: this.origem,
      data: this.data,
    };
  }
}
