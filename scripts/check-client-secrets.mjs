/** @format */

// Memindai bundel klien untuk memastikan tidak ada nilai rahasia yang ikut
// terkirim ke browser (acceptance criteria PHASE 5).
//
// Jalankan: npm run check:secrets

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const CLIENT_DIRS = [".next/static"];

// Variabel yang HARAM muncul di bundel klien.
const FORBIDDEN_ENV_KEYS = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_DB_PASSWORD",
  "DATABASE_URL",
  "OPENAI_API_KEY",
  "E2E_STUDENT_PASSWORD",
  "E2E_LECTURER_PASSWORD",
];

function* walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }

  for (const entry of entries) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      yield* walk(full);
    } else {
      yield full;
    }
  }
}

const secrets = FORBIDDEN_ENV_KEYS.map((key) => ({
  key,
  value: process.env[key],
})).filter((item) => item.value && item.value.length >= 8);

if (secrets.length === 0) {
  console.log(
    "\n[LEWAT] Tidak ada nilai rahasia di environment untuk dibandingkan.\n" +
      "Jalankan dengan .env.local terisi agar pemindaian bermakna.\n",
  );
  process.exit(0);
}

let scanned = 0;
const findings = [];

for (const dir of CLIENT_DIRS) {
  for (const file of walk(dir)) {
    if (!/\.(js|mjs|css|map|json|txt)$/.test(file)) continue;

    const content = readFileSync(file, "utf8");
    scanned += 1;

    for (const secret of secrets) {
      if (content.includes(secret.value)) {
        findings.push({ file, key: secret.key });
      }
    }
  }
}

console.log(`\nBerkas bundel klien dipindai : ${scanned}`);
console.log(`Nilai rahasia diperiksa      : ${secrets.length}`);

if (findings.length > 0) {
  console.error("\n[GAGAL] Nilai rahasia ditemukan di bundel klien:\n");
  for (const finding of findings) {
    console.error(`  ${finding.key} -> ${finding.file}`);
  }
  console.error("");
  process.exit(1);
}

console.log("\n[LULUS] Tidak ada nilai rahasia yang bocor ke bundel klien.\n");
