/** @format */

// Menjalankan berkas pgTAP di supabase/tests terhadap database Supabase.
// Dipakai karena `supabase test db` mensyaratkan Docker.
//
// Jalankan: npm run test:db

import { readdir, readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

import pg from "pg";

const TESTS_DIR = path.resolve("supabase/tests");
const POOLER_URL_FILE = path.resolve("supabase/.temp/pooler-url");

function fail(message) {
  console.error(`\n[GAGAL] ${message}\n`);
  process.exit(1);
}

// Menyusun connection string dari hasil `supabase link` + password, agar
// pengguna cukup menyimpan password alih-alih URL panjang.
function buildFromPoolerUrl(password) {
  if (!existsSync(POOLER_URL_FILE)) return null;
  const template = readFileSync(POOLER_URL_FILE, "utf8").trim();
  if (!template) return null;
  return template.replace(
    /:\/\/([^:]+):[^@]*@/,
    (_match, user) => `://${user}:${encodeURIComponent(password)}@`,
  );
}

function resolveConnectionString() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (process.env.SUPABASE_DB_PASSWORD) {
    const built = buildFromPoolerUrl(process.env.SUPABASE_DB_PASSWORD);
    if (built) return built;
  }
  return null;
}

const connectionString = resolveConnectionString();

if (!connectionString) {
  fail(
    "Kredensial database belum tersedia.\n\n" +
      "Pilih salah satu, tambahkan ke .env.local:\n\n" +
      "  (a) SUPABASE_DB_PASSWORD=<password database>\n" +
      "      Host diambil otomatis dari hasil `supabase link`.\n\n" +
      "  (b) DATABASE_URL=postgresql://postgres.<ref>:<password>@<host>:5432/postgres\n" +
      "      Ambil dari Supabase Dashboard -> Connect -> Session pooler.\n\n" +
      "Jangan menempelkan nilai ini ke percakapan mana pun.\n",
  );
}

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

// pgTAP mengeluarkan baris TAP sebagai satu kolom teks per baris hasil.
function collectTapLines(results) {
  const lines = [];
  for (const result of Array.isArray(results) ? results : [results]) {
    for (const row of result.rows ?? []) {
      for (const value of Object.values(row)) {
        if (typeof value === "string") lines.push(value);
      }
    }
  }
  return lines;
}

try {
  await client.connect();
  await client.query(
    "create extension if not exists pgtap with schema extensions;",
  );

  const files = (await readdir(TESTS_DIR))
    .filter((name) => name.endsWith(".sql"))
    .sort();

  if (files.length === 0) fail(`Tidak ada berkas .sql di ${TESTS_DIR}`);

  let failed = 0;
  let passed = 0;

  for (const file of files) {
    console.log(`\n=== ${file} ===`);
    const sql = await readFile(path.join(TESTS_DIR, file), "utf8");

    let lines;
    try {
      lines = collectTapLines(await client.query(sql));
    } catch (error) {
      await client.query("rollback").catch(() => {});
      fail(`${file}: ${error.message}`);
    }

    for (const line of lines) {
      if (line.startsWith("not ok")) {
        failed += 1;
        console.log(`  ✗ ${line}`);
      } else if (line.startsWith("ok ")) {
        passed += 1;
        console.log(`  ✓ ${line}`);
      } else if (line.trim().length > 0) {
        console.log(`    ${line}`);
      }
    }
  }

  console.log(`\nRingkasan: ${passed} lulus, ${failed} gagal.`);
  if (failed > 0) process.exit(1);
} catch (error) {
  fail(error.message);
} finally {
  await client.end().catch(() => {});
}
