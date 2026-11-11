// Teste de conexão (sem banco): o Database é Singleton e cria um único Pool.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const pg = vi.hoisted(() => ({ criados: [] as unknown[] }));

vi.mock('pg', () => ({
  Pool: class {
    constructor(public config: unknown) {
      pg.criados.push(config);
    }
    query = vi.fn(async () => ({ rows: [{ ok: 1 }], rowCount: 1 }));
    connect = vi.fn(async () => ({ query: vi.fn(async () => ({ rows: [] })), release: vi.fn() }));
  },
}));

describe('Database (conexão com o PostgreSQL)', () => {
  beforeEach(() => {
    vi.resetModules();
    pg.criados.length = 0;
    delete process.env.DATABASE_URL;
  });

  it('é Singleton: getInstancia devolve sempre o mesmo objeto', async () => {
    const { Database } = await import('./Database');
    expect(Database.getInstancia()).toBe(Database.getInstancia());
  });

  it('cria um único Pool, mesmo com várias chamadas', async () => {
    const { Database } = await import('./Database');
    Database.getInstancia();
    Database.getInstancia();
    Database.getInstancia();
    expect(pg.criados).toHaveLength(1);
  });

  it('usa DATABASE_URL quando definida', async () => {
    process.env.DATABASE_URL = 'postgresql://usuario:senha@servidor:5432/meubanco';
    const { Database } = await import('./Database');
    Database.getInstancia();
    expect(pg.criados[0]).toEqual({ connectionString: 'postgresql://usuario:senha@servidor:5432/meubanco' });
  });

  it('sem DATABASE_URL usa o banco local do Docker', async () => {
    const { Database } = await import('./Database');
    Database.getInstancia();
    expect(pg.criados[0]).toEqual({ connectionString: 'postgresql://atlas:atlas@localhost:5432/atlas' });
  });

  it('os Controllers do RF_B1, RF_F3 e RF_F11 usam o mesmo Database Singleton', async () => {
    const { Database } = await import('./Database');
    const { GerenciarAtendidosController } = await import('../GerenciarAtendidosController');
    const { ReceberDoacaoProdutoController } = await import('../ReceberDoacaoProdutoController');
    const { ReceberDoacaoDinheiroController } = await import('../ReceberDoacaoDinheiroController');

    const banco = Database.getInstancia();
    for (const c of [
      GerenciarAtendidosController.getInstancia(),
      ReceberDoacaoProdutoController.getInstancia(),
      ReceberDoacaoDinheiroController.getInstancia(),
    ]) {
      expect((c as unknown as { conexao: unknown }).conexao).toBe(banco);
    }
    expect(pg.criados).toHaveLength(1);
  });

  it('os Controllers também são Singleton', async () => {
    const { GerenciarAtendidosController: A } = await import('../GerenciarAtendidosController');
    const { ReceberDoacaoProdutoController: P } = await import('../ReceberDoacaoProdutoController');
    const { ReceberDoacaoDinheiroController: D } = await import('../ReceberDoacaoDinheiroController');
    expect(A.getInstancia()).toBe(A.getInstancia());
    expect(P.getInstancia()).toBe(P.getInstancia());
    expect(D.getInstancia()).toBe(D.getInstancia());
  });
});
