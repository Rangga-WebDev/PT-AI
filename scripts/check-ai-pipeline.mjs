/** @format */

// Uji kesehatan pipeline AI: kunci, embedding, retrieval, dan structured output.
// Memakai koneksi database langsung dengan menyamar sebagai mahasiswa dev,
// karena match_source_chunks memeriksa auth.uid() pemanggilnya.
//
// Jalankan: npm run ai:check

import process from "node:process";

import { GoogleGenAI } from "@google/genai";
import pg from "pg";

import { CREDENTIAL_HELP, resolveConnectionString } from "./db-connection.mjs";

const geminiKey = process.env.GEMINI_API_KEY;

function fail(message) {
  console.error(`\n[GAGAL] ${message}\n`);
  process.exit(1);
}

if (!geminiKey) fail("GEMINI_API_KEY belum diatur di .env.local.");

const connectionString = resolveConnectionString();
if (!connectionString) fail(CREDENTIAL_HELP);

const ai = new GoogleGenAI({ apiKey: geminiKey });
const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

function normalize(values) {
  const norm = Math.sqrt(values.reduce((sum, v) => sum + v * v, 0));
  return norm === 0 ? values : values.map((v) => v / norm);
}

try {
  await client.connect();

  const { rows } = await client.query(`
    select p.id as student_id, a.id as activity_id, a.title as activity_title
    from public.profiles p
    join public.enrollments e on e.student_id = p.id
    join public.modules m on m.class_id = e.class_id
    join public.learning_units lu on lu.module_id = m.id
    join public.learning_stages ls on ls.learning_unit_id = lu.id
    join public.activities a on a.learning_stage_id = ls.id
    where p.identifier = 'DEV-MHS-001' and a.status = 'published'
    order by ls.sequence
    limit 1
  `);

  const context = rows[0];
  if (!context)
    fail("Aktivitas seed tidak ditemukan. Jalankan npm run db:seed:academics.");

  // 1. Embedding
  const query = "Apakah konsultasi publik itu memenuhi ketentuan formal?";
  const embedResponse = await ai.models.embedContent({
    model: "gemini-embedding-001",
    contents: [query],
    config: { outputDimensionality: 1536 },
  });
  const values = embedResponse.embeddings?.[0]?.values;
  if (!values || values.length !== 1536) {
    fail(`Embedding berdimensi ${values?.length ?? 0}, seharusnya 1536.`);
  }
  console.log(`  1) Embedding      : OK (${values.length} dimensi)`);

  // 2. Retrieval dengan sesi mahasiswa
  await client.query("begin");
  await client.query("set local role authenticated");
  // SET tidak menerima parameter terikat; set_config dengan is_local = true.
  await client.query("select set_config('request.jwt.claims', $1, true)", [
    JSON.stringify({ sub: context.student_id, role: "authenticated" }),
  ]);

  const retrieval = await client.query(
    `select source_title, chunk_index, round(similarity::numeric, 4) as similarity
     from public.match_source_chunks($1, $2::extensions.vector, 3)`,
    [context.activity_id, JSON.stringify(normalize(values))],
  );
  await client.query("rollback");

  if (retrieval.rows.length === 0) {
    fail("Retrieval tidak mengembalikan potongan. Jalankan npm run ai:index.");
  }

  console.log(`  2) Retrieval      : OK (${retrieval.rows.length} potongan)`);
  for (const row of retrieval.rows) {
    console.log(
      `       sim ${row.similarity} | ${row.source_title} #${row.chunk_index}`,
    );
  }

  // 3. Retrieval harus kosong bagi pemanggil tanpa sesi (batas RLS).
  const anonymous = await client.query(
    `select count(*)::int as total
     from public.match_source_chunks($1, $2::extensions.vector, 3)`,
    [context.activity_id, JSON.stringify(normalize(values))],
  );
  const leaked = anonymous.rows[0]?.total ?? 0;
  if (leaked > 0) {
    fail(`Retrieval mengembalikan ${leaked} potongan tanpa sesi pengguna.`);
  }
  console.log("  3) Batas akses    : OK (tanpa sesi mengembalikan 0 potongan)");

  // 4. Structured output
  const generation = await ai.models.generateContent({
    model: "gemini-3.5-flash-lite",
    contents: "Buat satu pertanyaan penuntun. Jangan beri jawaban.",
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: { items: { type: "ARRAY", items: { type: "STRING" } } },
        required: ["items"],
      },
    },
  });
  JSON.parse(generation.text ?? "");
  console.log("  4) Structured out : OK");

  console.log("\n[LULUS] Pipeline AI sehat.\n");
} catch (error) {
  fail(error.message);
} finally {
  await client.end().catch(() => {});
}
