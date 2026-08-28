/** @format */

// Menerapkan berkas migration ke database Supabase memakai driver pg.
// Dipakai karena `supabase db push` meminta kata sandi secara interaktif.
//
// Jalankan: npm run db:migrate -- 20260828100016_ai_retrieval.sql
// Tanpa argumen: menerapkan seluruh berkas yang belum tercatat.

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import pg from "pg";

import { CREDENTIAL_HELP, resolveConnectionString } from "./db-connection.mjs";

const MIGRATIONS_DIR = path.resolve("supabase/migrations");

function fail(message) {
  console.error(`\n[GAGAL] ${message}\n`);
  process.exit(1);
}

const connectionString = resolveConnectionString();
if (!connectionString) fail(CREDENTIAL_HELP);

const requested = process.argv.slice(2);

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();

  // Penanda disimpan di schema ops, bukan public: setiap tabel public wajib
  // ber-RLS, dan bookkeeping internal tidak pantas ikut aturan itu.
  await client.query(`
    create schema if not exists ops;
    create table if not exists ops.applied_migrations (
      filename text primary key,
      applied_at timestamptz not null default now()
    );
  `);

  const files = (await readdir(MIGRATIONS_DIR))
    .filter((name) => name.endsWith(".sql"))
    .sort();

  const targets =
    requested.length > 0
      ? files.filter((name) => requested.includes(name))
      : files;

  if (targets.length === 0) fail("Tidak ada berkas migration yang cocok.");

  const { rows } = await client.query(
    "select filename from ops.applied_migrations",
  );
  const applied = new Set(rows.map((row) => row.filename));

  let count = 0;

  for (const file of targets) {
    if (applied.has(file) && requested.length === 0) {
      continue;
    }

    const sql = await readFile(path.join(MIGRATIONS_DIR, file), "utf8");

    try {
      await client.query("begin");
      await client.query(sql);
      await client.query(
        `insert into ops.applied_migrations (filename) values ($1)
         on conflict (filename) do update set applied_at = now()`,
        [file],
      );
      await client.query("commit");
      console.log(`  diterapkan: ${file}`);
      count += 1;
    } catch (error) {
      await client.query("rollback").catch(() => {});
      fail(`${file}: ${error.message}`);
    }
  }

  console.log(`\n${count} migration diterapkan.\n`);
} catch (error) {
  fail(error.message);
} finally {
  await client.end().catch(() => {});
}
