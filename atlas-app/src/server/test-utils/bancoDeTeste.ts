// Prepara um banco PostgreSQL de verdade para os testes de integração.
//
// Como usar: defina TEST_DATABASE_URL apontando para um banco QUALQUER (ex.: o do Docker):
//   TEST_DATABASE_URL=postgresql://atlas:atlas@localhost:5432/atlas npm test
// Cada arquivo de teste cria um schema próprio e temporário (teste_...), roda sql/schema.sql dentro dele
// e apaga tudo no fim. Os dados reais do banco não são tocados.
// Sem TEST_DATABASE_URL, os testes de integração são ignorados (os demais testes rodam normalmente).
import { Client } from 'pg';
import fs from 'node:fs';
import path from 'node:path';

export const URL_BANCO_DE_TESTE = process.env.TEST_DATABASE_URL;
export const TEM_BANCO_DE_TESTE = Boolean(URL_BANCO_DE_TESTE);

export async function prepararBancoDeTeste(): Promise<{ schema: string; limpar: () => Promise<void> }> {
  if (!URL_BANCO_DE_TESTE) throw new Error('TEST_DATABASE_URL não definida.');

  // nome gerado aqui (só letras/números/_): seguro para usar como identificador
  const schema = `teste_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const admin = new Client({ connectionString: URL_BANCO_DE_TESTE });
  await admin.connect();
  try {
    await admin.query(`CREATE SCHEMA ${schema}`);
    await admin.query(`SET search_path TO ${schema}`);
    await admin.query(fs.readFileSync(path.resolve(process.cwd(), 'sql/schema.sql'), 'utf8'));
  } finally {
    await admin.end();
  }

  // o Database (Singleton) lê DATABASE_URL: faz ele usar só o schema de teste
  const url = new URL(URL_BANCO_DE_TESTE);
  url.searchParams.set('options', `-c search_path=${schema}`);
  process.env.DATABASE_URL = url.toString();

  return {
    schema,
    limpar: async () => {
      const c = new Client({ connectionString: URL_BANCO_DE_TESTE });
      await c.connect();
      try {
        await c.query(`DROP SCHEMA ${schema} CASCADE`);
      } finally {
        await c.end();
      }
    },
  };
}
