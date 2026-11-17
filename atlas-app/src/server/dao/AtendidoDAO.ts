// DAO - Atendido (RF_B1). Só executa SQL; todas as consultas usam parâmetros ($1, $2...)
// e nunca concatenam texto vindo do usuário no comando SQL. Recebe a conexão no construtor e os
// dados por parâmetro, e devolve registros simples (AtendidoRegistro): quem monta o Atendido é o Model.
import type { ExecutorSQL } from './tipos';
import type { FiltroAtendido } from '../model/FiltroAtendido';

// dados que o Model passa para gravar (datas em aaaa-mm-dd)
export interface AtendidoDados {
  id?: number;
  nome: string;
  dataNascimento: string;
  sexo: string;
  responsavelLegal: string;
}

// registro lido do banco (datas em aaaa-mm-dd)
export interface AtendidoRegistro {
  id: number;
  nome: string;
  dataNascimento: string;
  sexo: string;
  responsavelLegal: string;
  dataCadastro: string;
}

interface AtendidoLinha {
  id: number;
  nome: string;
  data_nascimento: string;
  sexo: string | null;
  responsavel_legal: string | null;
  data_cadastro: string;
}

// to_char devolve a data como texto 'aaaa-mm-dd' (evita problema de fuso horário com Date)
const COLUNAS = `id, nome, to_char(data_nascimento, 'YYYY-MM-DD') AS data_nascimento, sexo, responsavel_legal,
                 to_char(data_cadastro, 'YYYY-MM-DD') AS data_cadastro`;

// compara nomes sem diferenciar maiúsculas e acentos ("joao" encontra "João")
const COM_ACENTOS = 'áàâãäéèêëíìîïóòôõöúùûüçñ';
const SEM_ACENTOS = 'aaaaaeeeeiiiiooooouuuucn';
const SEM_ACENTO_SQL = (coluna: string) => `translate(lower(${coluna}), '${COM_ACENTOS}', '${SEM_ACENTOS}')`;

function semAcento(texto: string): string {
  return texto
    .toLowerCase()
    .split('')
    .map((c) => {
      const i = COM_ACENTOS.indexOf(c);
      return i >= 0 ? SEM_ACENTOS[i] : c;
    })
    .join('');
}

// % e _ digitados pelo usuário valem como texto comum na busca, não como curinga
function escaparCuringas(texto: string): string {
  return texto.replace(/[\\%_]/g, (c) => `\\${c}`);
}

function linhaParaRegistro(linha: AtendidoLinha): AtendidoRegistro {
  return {
    id: linha.id,
    nome: linha.nome,
    dataNascimento: linha.data_nascimento,
    sexo: linha.sexo ?? '',
    responsavelLegal: linha.responsavel_legal ?? '',
    dataCadastro: linha.data_cadastro,
  };
}

export class AtendidoDAO {
  constructor(private readonly executor: ExecutorSQL) {}

  async inserir(atendido: AtendidoDados): Promise<AtendidoRegistro> {
    const resultado = await this.executor.query<AtendidoLinha>(
      `INSERT INTO atendido (nome, data_nascimento, sexo, responsavel_legal)
       VALUES ($1, $2, $3, $4)
       RETURNING ${COLUNAS}`,
      [atendido.nome, atendido.dataNascimento, atendido.sexo, atendido.responsavelLegal]
    );
    return linhaParaRegistro(resultado.rows[0]);
  }

  // a data de cadastro não é alterada
  async atualizar(atendido: AtendidoDados): Promise<AtendidoRegistro | null> {
    const resultado = await this.executor.query<AtendidoLinha>(
      `UPDATE atendido
          SET nome = $1, data_nascimento = $2, sexo = $3, responsavel_legal = $4
        WHERE id = $5
    RETURNING ${COLUNAS}`,
      [
        atendido.nome,
        atendido.dataNascimento,
        atendido.sexo,
        atendido.responsavelLegal,
        atendido.id,
      ]
    );
    return resultado.rows[0] ? linhaParaRegistro(resultado.rows[0]) : null;
  }

  async excluir(id: number): Promise<boolean> {
    const resultado = await this.executor.query('DELETE FROM atendido WHERE id = $1', [id]);
    return (resultado.rowCount ?? 0) > 0;
  }

  async buscarPorId(id: number): Promise<AtendidoRegistro | null> {
    const resultado = await this.executor.query<AtendidoLinha>(`SELECT ${COLUNAS} FROM atendido WHERE id = $1`, [id]);
    return resultado.rows[0] ? linhaParaRegistro(resultado.rows[0]) : null;
  }

  async existeIgual(nome: string, dataNascimentoIso: string, idIgnorado?: number): Promise<boolean> {
    const resultado = await this.executor.query<{ id: number }>(
      `SELECT id FROM atendido
        WHERE lower(nome) = lower($1) AND data_nascimento = $2 AND ($3::int IS NULL OR id <> $3)`,
      [nome, dataNascimentoIso, idIgnorado ?? null]
    );
    return resultado.rows.length > 0;
  }

  // filtro vazio traz todos; os 3 filtros (nome, sexo, idade) se combinam com AND
  async consultar(filtro: FiltroAtendido): Promise<AtendidoRegistro[]> {
    const condicoes: string[] = [];
    const parametros: unknown[] = [];

    if (filtro.getNome() !== '') {
      parametros.push(`%${escaparCuringas(semAcento(filtro.getNome()))}%`);
      condicoes.push(`${SEM_ACENTO_SQL('nome')} LIKE $${parametros.length}`);
    }
    if (filtro.getSexo() !== '') {
      parametros.push(filtro.getSexo());
      condicoes.push(`sexo = $${parametros.length}`);
    }
    const minima = filtro.getIdadeMinima();
    if (minima !== null) {
      parametros.push(minima);
      condicoes.push(`EXTRACT(YEAR FROM age(CURRENT_DATE, data_nascimento)) >= $${parametros.length}`);
    }
    const maxima = filtro.getIdadeMaxima();
    if (maxima !== null) {
      parametros.push(maxima);
      condicoes.push(`EXTRACT(YEAR FROM age(CURRENT_DATE, data_nascimento)) <= $${parametros.length}`);
    }

    const where = condicoes.length > 0 ? `WHERE ${condicoes.join(' AND ')}` : '';
    const resultado = await this.executor.query<AtendidoLinha>(
      `SELECT ${COLUNAS} FROM atendido ${where} ORDER BY nome, id`,
      parametros
    );
    return resultado.rows.map(linhaParaRegistro);
  }
}
