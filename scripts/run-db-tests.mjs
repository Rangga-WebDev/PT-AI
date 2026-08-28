/** @format */

// Menjalankan berkas pgTAP di supabase/tests terhadap database Supabase.
// Dipakai karena `supabase test db` mensyaratkan Docker.
//
// Jalankan: npm run test:db

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import pg from "pg";

import { CREDENTIAL_HELP, resolveConnectionString } from "./db-connection.mjs";

const TESTS_DIR = path.resolve("supabase/tests");

function fail(message) {
  console.error(`\n[GAGAL] ${message}\n`);
  process.exit(1);
}

const connectionString = resolveConnectionString();

if (!connectionString) {
  fail(CREDENTIAL_HELP);
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

    let planned = null;
    let ran = 0;

    for (const line of lines) {
      const plan = /^1\.\.(\d+)$/.exec(line.trim());
      if (plan?.[1]) planned = Number(plan[1]);

      if (line.startsWith("not ok")) {
        failed += 1;
        ran += 1;
        console.log(`  ✗ ${line}`);
      } else if (line.startsWith("ok ")) {
        passed += 1;
        ran += 1;
        console.log(`  ✓ ${line}`);
      } else if (line.trim().length > 0) {
        console.log(`    ${line}`);
      }
    }

    // plan(n) yang tidak cocok berarti ada test yang lupa dihitung atau
    // berhenti di tengah jalan; keduanya menyesatkan bila dibiarkan lolos.
    if (planned !== null && planned !== ran) {
      failed += 1;
      console.log(
        `  ✗ plan tidak cocok: plan(${planned}) tetapi ${ran} test dijalankan`,
      );
    }
  }

  console.log(`\nRingkasan: ${passed} lulus, ${failed} gagal.`);
  if (failed > 0) process.exit(1);
} catch (error) {
  fail(error.message);
} finally {
  await client.end().catch(() => {});
}
