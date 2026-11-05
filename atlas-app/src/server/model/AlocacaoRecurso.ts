  // Model - AlocacaoRecurso (RF_F9): recurso do tipo produto ou financeiro
  import { ErroValidacao } from '../erros';

  export type TipoRecurso = 'PRODUTO' | 'FINANCEIRO';

  export interface AlocacaoRecursoAtributos {
    id?: number;
    eventoId?: number;
    tipo: TipoRecurso;
    produtoId?: number | null;
    quantidade?: number | null;
    valor?: number | null;
  }

  export class AlocacaoRecurso {
    private id?: number;
    private eventoId?: number;
    private tipo: TipoRecurso;
    private produtoId: number | null;
    private quantidade: number | null;
    private valor: number | null;

    constructor(atributos: AlocacaoRecursoAtributos) {
      this.id = atributos.id;
      this.eventoId = atributos.eventoId;
      this.tipo = atributos.tipo;
      this.produtoId = atributos.produtoId ?? null;
      this.quantidade = atributos.quantidade ?? null;
      this.valor = atributos.valor ?? null;
    }

    getId(): number | undefined {
      return this.id;
    }

    setId(id: number): void {
      this.id = id;
    }

    setEventoId(eventoId: number): void {
      this.eventoId = eventoId;
    }

    getEventoId(): number | undefined {
      return this.eventoId;
    }

    getTipo(): TipoRecurso {
      return this.tipo;
    }

    getProdutoId(): number | null {
      return this.produtoId;
    }

    getQuantidade(): number | null {
      return this.quantidade;
    }

    getValor(): number | null {
      return this.valor;
    }

    validar(): void {
      if (this.tipo === 'PRODUTO') {
        if (!this.produtoId) {
          throw new ErroValidacao('Selecione um produto para o recurso.');
        }
        if (!this.quantidade || this.quantidade <= 0) {
          throw new ErroValidacao('A quantidade do recurso deve ser maior que zero.');
        }
        if (this.valor !== null) {
          throw new ErroValidacao('Um recurso do tipo produto não deve ter valor financeiro.');
        }
      } else if (this.tipo === 'FINANCEIRO') {
        if (!this.valor || this.valor <= 0) {
          throw new ErroValidacao('O valor do recurso financeiro deve ser maior que zero.');
        }
        if (this.produtoId !== null || this.quantidade !== null) {
          throw new ErroValidacao('Um recurso financeiro não deve ter produto nem quantidade.');
        }
      } else {
        throw new ErroValidacao('Tipo de recurso inválido.');
      }
    }

    paraLinhaDeDados() {
      return {
        id: this.id,
        eventoId: this.eventoId,
        tipo: this.tipo,
        produtoId: this.produtoId,
        quantidade: this.quantidade,
        valor: this.valor,
      };
    }
  }
