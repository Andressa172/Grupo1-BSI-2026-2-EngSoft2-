// Model - Evento (RF_F9)
import { ErroValidacao } from '../erros';

export interface EventoAtributos {
  id?: number;
  nome: string;
  data: string; // 'YYYY-MM-DD'
  descricao?: string | null;
  criadoPor?: number | null;
}

export class Evento {
  private id?: number;
  private nome: string;
  private data: string;
  private descricao: string | null;
  private criadoPor: number | null;

  constructor(atributos: EventoAtributos) {
    this.id = atributos.id;
    this.nome = atributos.nome?.trim() ?? '';
    this.data = atributos.data;
    this.descricao = atributos.descricao?.trim() || null;
    this.criadoPor = atributos.criadoPor ?? null;
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

  getData(): string {
    return this.data;
  }

  getDescricao(): string | null {
    return this.descricao;
  }

  getCriadoPor(): number | null {
    return this.criadoPor;
  }

  validar(): void {
    if (!this.nome || this.nome.length === 0) {
      throw new ErroValidacao('O nome do evento é obrigatório.');
    }
    if (this.nome.length > 120) {
      throw new ErroValidacao('O nome do evento deve ter no máximo 120 caracteres.');
    }

    if (!this.data || !/^\d{4}-\d{2}-\d{2}$/.test(this.data)) {
      throw new ErroValidacao('A data do evento é inválida.');
    }
    const dataEvento = new Date(`${this.data}T00:00:00`);
    if (Number.isNaN(dataEvento.getTime())) {
      throw new ErroValidacao('A data do evento é inválida.');
    }
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    if (dataEvento < hoje) {
      throw new ErroValidacao('A data do evento não pode ser anterior à data atual.');
    }
  }

  paraLinhaDeDados() {
    return {
      id: this.id,
      nome: this.nome,
      data: this.data,
      descricao: this.descricao,
      criadoPor: this.criadoPor,
    };
  }
}
