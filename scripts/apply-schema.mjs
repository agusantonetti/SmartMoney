#!/usr/bin/env node
// Aplica supabase/schema.sql al proyecto Supabase usando la connection string
// completa que se pasa en la variable de entorno SUPABASE_DB_URL.
//
// Uso:
//   SUPABASE_DB_URL="postgresql://postgres:PASS@db.PROJECT.supabase.co:5432/postgres" node scripts/apply-schema.mjs
//
// O con archivo .env.local en la raíz del proyecto (ver dotenv).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import pg from 'pg';
import { config as loadEnv } from 'dotenv';

// Cargar .env.local (Vite convention) en lugar del .env por defecto
loadEnv({ path: resolve(dirname(fileURLToPath(import.meta.url)), '..', '.env.local') });

const { Client } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = resolve(__dirname, '..', 'supabase', 'schema.sql');

const url = process.env.SUPABASE_DB_URL;
if (!url) {
  console.error('ERROR: SUPABASE_DB_URL no está definida.');
  console.error('Crea un archivo .env.local en la raíz con:');
  console.error('  SUPABASE_DB_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres');
  process.exit(1);
}

const sql = readFileSync(SCHEMA_PATH, 'utf8');
console.log(`Cargado schema.sql (${sql.length} chars).`);

const client = new Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});

try {
  console.log('Conectando a Postgres...');
  await client.connect();
  console.log('Conectado.');
  console.log('Aplicando schema (esto incluye tablas, RLS, triggers, policies)...');
  await client.query(sql);
  console.log('Schema aplicado OK.');

  // Verificación: contar tablas creadas
  const r = await client.query(`
    select tablename from pg_tables
    where schemaname = 'public'
    order by tablename;
  `);
  console.log(`\nTablas en public (${r.rows.length}):`);
  r.rows.forEach(row => console.log(`  - ${row.tablename}`));

  // Verificar RLS
  const rls = await client.query(`
    select tablename from pg_tables
    where schemaname = 'public' and rowsecurity = true
    order by tablename;
  `);
  console.log(`\nTablas con RLS activado (${rls.rows.length}):`);
  rls.rows.forEach(row => console.log(`  - ${row.tablename}`));
} catch (e) {
  console.error('ERROR aplicando schema:', e.message);
  if (e.detail) console.error('Detalle:', e.detail);
  process.exit(1);
} finally {
  await client.end();
}
