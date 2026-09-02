/** @format */

// Laporan kebersihan basis data. Memisahkan baris kanonik yang memang dibuat
// migrasi dari data setup pilot dan sisa data pengujian.
//
// Jalankan: npm run check:clean

import process from "node:process";

import pg from "pg";

import { CREDENTIAL_HELP, resolveConnectionString } from "./db-connection.mjs";

const connectionString = resolveConnectionString();
if (!connectionString) {
  console.error(`\n[GAGAL] ${CREDENTIAL_HELP}\n`);
  process.exit(1);
}

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

const count = async (table, where = "") =>
  (await client.query(`select count(*)::int n from public.${table} ${where}`))
    .rows[0].n;

const CANONICAL = ["roles", "error_categories", "ai_prompt_templates"];
const SETUP = [
  "organizations",
  "faculties",
  "study_programs",
  "academic_periods",
  "profiles",
  "role_assignments",
  "courses",
  "classes",
  "class_lecturers",
  "enrollments",
  "modules",
  "learning_units",
  "activities",
  "cases",
  "sources",
  "rubrics",
];
// Artefak kognitif: apa pun di sini bukan setup, melainkan jejak orang belajar.
const RESEARCH = [
  "attempts",
  "revisions",
  "reflections",
  "mastery_results",
  "critical_thinking_scores",
  "ai_interactions",
  "ai_feedback",
  "feedback_records",
  "learning_events",
  "learning_sessions",
  "source_verifications",
];

const section = async (title, tables) => {
  console.log(`\n${title}`);
  let total = 0;
  for (const table of tables) {
    const n = await count(table);
    total += n;
    console.log(`  ${table.padEnd(26)} ${n}`);
  }
  return total;
};

await section("KANONIK (dibuat migrasi)", CANONICAL);
await section("SETUP PILOT", SETUP);
const research = await section("ARTEFAK PENELITIAN", RESEARCH);

const fixtures = await count(
  "learning_units",
  "where title like 'Unit Uji%' or title like '%Uji Attempt%'",
);
const testRubrics = await count("rubrics", "where title like '%Uji%'");
const testSources = await count("sources", "where title like 'Sumber Uji%'");
const devProfiles = await count("profiles", "where identifier like 'DEV-%'");

const { rows: auth } = await client.query(
  "select count(*)::int n from auth.users",
);
const { rows: objects } = await client.query(
  "select count(*)::int n from storage.objects",
);

console.log("\nSISA DATA PENGUJIAN");
console.log(`  unit fixture E2E           ${fixtures}`);
console.log(`  rubrik uji                 ${testRubrics}`);
console.log(`  sumber uji                 ${testSources}`);
console.log(`  profil DEV-*               ${devProfiles}`);
console.log(`  objek storage              ${objects[0].n}`);
console.log(`  akun auth                  ${auth[0].n}`);

await client.end();

const dirty = research + fixtures + testRubrics + testSources;
console.log(
  dirty === 0
    ? "\n[BERSIH] Nol artefak penelitian dan nol fixture pengujian.\n"
    : `\n[KOTOR] ${dirty} baris pengujian tersisa.\n`,
);
process.exit(dirty === 0 ? 0 : 1);
