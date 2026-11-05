// Model - Doador (RF_B4)
import { ErroValidacao } from '../erros';

export type TipoPessoa = 'FISICA' | 'JURIDICA';

export interface DoadorAtributos {
  id?: number;
  nome: string;
  contato?: string | null;
  tipoPessoa?: TipoPessoa;
  anonimo?: boolean;
}

export class Doador {
  private id?: number;
  private nome: string;
  private contato: string | null;
  private tipoPessoa: TipoPessoa;
  private anonimo: boolean;

  constructor(atributos: DoadorAtributos) {
    this.id = atributos.id;
    this.nome = atributos.nome?.trim() ?? '';
    this.contato = atributos.contato?.trim() || null;
    this.tipoPessoa = atributos.tipoPessoa ?? 'FISICA';
    this.anonimo = atributos.anonimo ?? false;
  }

  getId(): number | undefined {
    return this.id;
  }

  setId(id: number): void {
    this.id = id;
  }

  getNome(): string {
    return this.nome;
  }

  setNome(nome: string): void {
    this.nome = nome?.trim() ?? '';
  }

  getContato(): string | null {
    return this.contato;
  }

  setContato(contato: string | null): void {
    this.contato = contato?.trim() || null;
  }

  getTipoPessoa(): TipoPessoa {
    return this.tipoPessoa;
  }

  setTipoPessoa(tipoPessoa: TipoPessoa): void {
    this.tipoPessoa = tipoPessoa;
  }

  isAnonimo(): boolean {
    return this.anonimo;
  }

  setAnonimo(anonimo: boolean): void {
    this.anonimo = anonimo;
  }

  // doador anônimo dispensa nome e contato
  validar(): void {
    if (this.anonimo) {
      return;
    }
    if (!this.nome || this.nome.length === 0) {
      throw new ErroValidacao('O nome do doador é obrigatório.');
    }
    if (this.nome.length > 120) {
      throw new ErroValidacao('O nome do doador deve ter no máximo 120 caracteres.');
    }
    if (this.tipoPessoa !== 'FISICA' && this.tipoPessoa !== 'JURIDICA') {
      throw new ErroValidacao('Tipo de pessoa inválido.');
    }
  }

  paraLinhaDeDados() {
    return {
      id: this.id,
      nome: this.nome,
      contato: this.contato,
      tipoPessoa: this.tipoPessoa,
      anonimo: this.anonimo,
    };
  }
}
