import { Atendido } from '@/model/Atendido';

/** Como o atendido é gravado (datas em ISO, para caber em JSON). */
export interface RegistroAtendido {
  id: string;
  nome: string;
  dataNascimento: string;
  sexo: string;
  responsavelLegal: string;
  dataCadastro: string;
}

const CHAVE = 'atlas-atendidos';

/**
 * DAO de Atendido. Guarda os dados no localStorage do navegador, numa chave própria
 * (não mexe no store do restante do sistema). Se o grupo trocar para banco de dados,
 * só esta classe muda: Control e View continuam iguais.
 */
export class AtendidoDAO {
  private lerTodos(): RegistroAtendido[] {
    if (typeof window === 'undefined') return [];
    try {
      const bruto = window.localStorage.getItem(CHAVE);
      return bruto ? (JSON.parse(bruto) as RegistroAtendido[]) : [];
    } catch {
      return [];
    }
  }

  private gravarTodos(lista: RegistroAtendido[]): void {
    try {
      window.localStorage.setItem(CHAVE, JSON.stringify(lista));
    } catch {
      /* armazenamento indisponível: ignora */
    }
  }

  private paraRegistro(a: Atendido): RegistroAtendido {
    return {
      id: a.id,
      nome: a.nome.trim(),
      dataNascimento: a.dataNascimento.toISOString(),
      sexo: a.sexo,
      responsavelLegal: a.responsavelLegal.trim(),
      dataCadastro: a.dataCadastro.toISOString(),
    };
  }

  listar(): RegistroAtendido[] {
    return this.lerTodos();
  }

  buscarPorId(id: string): RegistroAtendido | undefined {
    return this.lerTodos().find((r) => r.id === id);
  }

  /** Inclui um novo atendido e devolve o id gerado. */
  incluir(atendido: Atendido): string {
    const id = `at-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    atendido.id = id;
    this.gravarTodos([...this.lerTodos(), this.paraRegistro(atendido)]);
    return id;
  }

  alterar(atendido: Atendido): void {
    this.gravarTodos(this.lerTodos().map((r) => (r.id === atendido.id ? this.paraRegistro(atendido) : r)));
  }

  excluir(id: string): void {
    this.gravarTodos(this.lerTodos().filter((r) => r.id !== id));
  }
}
