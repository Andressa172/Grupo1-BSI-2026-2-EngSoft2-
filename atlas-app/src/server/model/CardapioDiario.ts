// Model - CardapioDiario (RF_F10)
import { ErroValidacao } from '../erros';

export type TipoRefeicao = 'CAFE_DA_MANHA' | 'ALMOCO' | 'LANCHE' | 'JANTAR';

const TIPOS_REFEICAO: TipoRefeicao[] = ['CAFE_DA_MANHA', 'ALMOCO', 'LANCHE', 'JANTAR'];

export interface CardapioDiarioAtributos {
  id?: number;
  data: string; // 'YYYY-MM-DD'
  tipoRefeicao: TipoRefeicao;
  criadoPor?: number | null;
}

export class CardapioDiario {
  private id?: number;
  private data: string;
  private tipoRefeicao: TipoRefeicao;
  private criadoPor: number | null;

  constructor(atributos: CardapioDiarioAtributos) {
    this.id = atributos.id;
    this.data = atributos.data;
    this.tipoRefeicao = atributos.tipoRefeicao;
    this.criadoPor = atributos.criadoPor ?? null;
  }

  getId(): number | undefined {
    return this.id;
  }

  setId(id: number): void {
    this.id = id;
  }

  getData(): string {
    return this.data;
  }

  getTipoRefeicao(): TipoRefeicao {
    return this.tipoRefeicao;
  }

  getCriadoPor(): number | null {
    return this.criadoPor;
  }

  validar(): void {
    if (!this.data || !/^\d{4}-\d{2}-\d{2}$/.test(this.data)) {
      throw new ErroValidacao('A data do cardápio é inválida.');
    }
    const dataCardapio = new Date(`${this.data}T00:00:00`);
    if (Number.isNaN(dataCardapio.getTime())) {
      throw new ErroValidacao('A data do cardápio é inválida.');
    }
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    if (dataCardapio < hoje) {
      throw new ErroValidacao('A data do cardápio não pode ser anterior à data atual.');
    }
    if (!this.tipoRefeicao || !TIPOS_REFEICAO.includes(this.tipoRefeicao)) {
      throw new ErroValidacao('Selecione o tipo de refeição.');
    }
  }

  paraLinhaDeDados() {
    return {
      id: this.id,
      data: this.data,
      tipoRefeicao: this.tipoRefeicao,
      criadoPor: this.criadoPor,
    };
  }
}
