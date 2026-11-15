/**
 * Executa um arquivo .sql contra o banco apontado por DATABASE_URL.
 * Uso: tsx scripts/db-run-sql.ts sql/schema.sql
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { Client } from 'pg';

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

config({ path: resolve(appRoot, '.env.local') });
config({ path: resolve(appRoot, '.env') });

const caminho = process.argv[2];
if (!caminho) {
  console.error('Uso: tsx scripts/db-run-sql.ts <caminho-do-arquivo.sql>');
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL ?? 'postgresql://atlas:atlas@localhost:5432/atlas';
const sql = readFileSync(resolve(appRoot, caminho), 'utf-8');

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
