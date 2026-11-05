/**
 * Executa um arquivo .sql contra o banco apontado por DATABASE_URL.
 * Uso: tsx scripts/db-run-sql.ts sql/schema.sql
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { Client } from 'pg';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const caminho = process.argv[2];
if (!caminho) {
  console.error('Uso: tsx scripts/db-run-sql.ts <caminho-do-arquivo.sql>');
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL ?? 'postgresql://atlas:atlas@localhost:5432/atlas';
const sql = readFileSync(resolve(process.cwd(), caminho), 'utf-8');

async function main() {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    await client.query(sql);
    console.log(`OK: ${caminho} executado em ${connectionString.replace(/:[^:@]+@/, ':***@')}`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Falha ao executar SQL:', err.message);
  process.exit(1);
});
