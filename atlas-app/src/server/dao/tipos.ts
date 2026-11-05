import type { QueryResult, QueryResultRow } from 'pg';

// Pool normal ou client de uma transação em aberto - os DAOs só precisam disso
export interface ExecutorSQL {
  query<T extends QueryResultRow = QueryResultRow>(texto: string, parametros?: unknown[]): Promise<QueryResult<T>>;
}
