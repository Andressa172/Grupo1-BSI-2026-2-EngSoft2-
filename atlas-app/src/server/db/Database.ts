// Conexão com o PostgreSQL (padrão Singleton: um Pool só por processo).
import { Pool, type PoolClient, type QueryResultRow } from 'pg';

// guardado no global pra sobreviver ao hot reload do Next em dev
const globalParaSingleton = globalThis as unknown as { atlasDatabase?: Database };

export class Database {
  private readonly pool: Pool;

  private constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL ?? 'postgresql://atlas:atlas@localhost:5432/atlas',
    });
  }

  static getInstancia(): Database {
    if (!globalParaSingleton.atlasDatabase) {
      globalParaSingleton.atlasDatabase = new Database();
    }
    return globalParaSingleton.atlasDatabase;
  }

  async query<T extends QueryResultRow = QueryResultRow>(texto: string, parametros?: unknown[]) {
    return this.pool.query<T>(texto, parametros);
  }

  // begin/commit automático; dá rollback se `executar` lançar erro
  async comTransacao<T>(executar: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const resultado = await executar(client);
      await client.query('COMMIT');
      return resultado;
    } catch (erro) {
      await client.query('ROLLBACK');
      throw erro;
    } finally {
      client.release();
    }
  }
}
