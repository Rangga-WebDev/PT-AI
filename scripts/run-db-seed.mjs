/** @format */

// Menjalankan berkas SQL di supabase/seed terhadap database Supabase.
// Terpisah dari migration: seed berisi data, bukan perubahan schema.
//
// Jalankan: npm run db:seed

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import pg from "pg";

import { resolveConnectionString } from "./db-connection.mjs";

const SEED_DIR = path.resolve("supabase/seed");

const connectionString = resolveConnectionString();

if (!connectionString) {
  console.error(
    "\n[GAGAL] Kredensial database belum tersedia di .env.local.\n",
  );
  process.exit(1);
}

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();

  const files = (await readdir(SEED_DIR))
    .filter((name) => name.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const sql = await readFile(path.join(SEED_DIR, file), "utf8");
    await client.query(sql);
    console.log(`  ✓ ${file}`);
  }

  const { rows } = await client.query(
    `select
       (select count(*) from public.organizations) as organizations,
       (select count(*) from public.faculties) as faculties,
       (select count(*) from public.study_programs) as study_programs,
       (select count(*) from public.academic_periods) as academic_periods,
       (select count(*) from public.roles) as roles,
       (select count(*) from public.error_categories) as error_categories,
       (select count(*) from public.data_retention_rules) as data_retention_rules;`,
  );

  console.log("\nIsi tabel setelah seed:");
  for (const [table, count] of Object.entries(rows[0] ?? {})) {
    console.log(`  ${table.padEnd(22)} : ${count}`);
  }
} catch (error) {
  console.error(`\n[GAGAL] ${error.message}\n`);
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
