/** @format */

// Impor hasil tes studi pendahuluan dari CSV ke schema research.
//
// Mode uji (bawaan) hanya memeriksa dan melapor. --apply menulis seluruhnya
// dalam satu transaksi, lalu mencocokkan ulang setiap jawaban dan skor yang
// tersimpan dengan berkas sumber sebelum commit. Berkas yang sama (checksum
// SHA-256) tidak pernah diimpor dua kali; berkas koreksi menjadi dataset baru.
//
// npm run research:import-preliminary -- --answers <Jawaban Lengkap 50.csv>
//   --blueprint <1. Kisi-kisi Instrumen.csv> [--apply]

import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { parseArgs } from "node:util";

import pg from "pg";

import { CREDENTIAL_HELP, resolveConnectionString } from "./db-connection.mjs";
import {
  buildImportPlan,
  DEFAULT_EXPECTED_RESPONDENTS,
  DEFAULT_TITLE,
  deriveSheetNames,
  formatReport,
} from "./lib/preliminary-study.mjs";

const { values } = parseArgs({
  options: {
    answers: { type: "string" },
    blueprint: { type: "string" },
    "answers-sheet": { type: "string" },
    "blueprint-sheet": { type: "string" },
    "organization-code": { type: "string", default: "UNISMUH" },
    expected: { type: "string", default: String(DEFAULT_EXPECTED_RESPONDENTS) },
    title: { type: "string", default: DEFAULT_TITLE },
    apply: { type: "boolean", default: false },
  },
});

function fail(message) {
  console.error(`\n[GAGAL] ${message}\n`);
  process.exit(1);
}

class ImportError extends Error {}

if (!values.answers || !values.blueprint) {
  fail(
    "Sebutkan --answers <berkas jawaban .csv> dan --blueprint <berkas kisi-kisi .csv>.",
  );
}
const expected = Number(values.expected);
if (!Number.isInteger(expected) || expected < 1) {
  fail("--expected harus bilangan bulat positif.");
}

const answersPath = path.resolve(values.answers);
const blueprintPath = path.resolve(values.blueprint);
const answersFile = path.basename(answersPath);
const blueprintFile = path.basename(blueprintPath);
const [answersSheet, blueprintSheet] = deriveSheetNames(
  answersFile,
  blueprintFile,
);

let answersBytes;
let blueprintBytes;
try {
  [answersBytes, blueprintBytes] = await Promise.all([
    readFile(answersPath),
    readFile(blueprintPath),
  ]);
} catch {
  fail("Berkas jawaban atau kisi-kisi tidak dapat dibaca.");
}

const plan = buildImportPlan({
  answers: {
    fileName: answersFile,
    sheetName: values["answers-sheet"]?.trim() || answersSheet,
    bytes: answersBytes,
  },
  blueprint: {
    fileName: blueprintFile,
    sheetName: values["blueprint-sheet"]?.trim() || blueprintSheet,
    bytes: blueprintBytes,
  },
  expectedRespondents: expected,
  title: values.title.trim(),
});

console.log(formatReport(plan, { answersPath, blueprintPath }));

if (!plan.ok) {
  fail("Impor ditolak. Perbaiki berkas sumber, lalu jalankan ulang.");
}
if (!values.apply) {
  console.log(
    "\nMode uji: tidak ada yang ditulis. Tambahkan --apply untuk menyimpan.\n",
  );
  process.exit(0);
}

const connectionString = resolveConnectionString();
if (!connectionString) fail(CREDENTIAL_HELP);

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function writePlan() {
  await client.query(
    "select pg_advisory_xact_lock(hashtext('ptai-preliminary-import'))",
  );

  const { rows: organizations } = await client.query(
    "select id from public.organizations where code = $1 and is_active",
    [values["organization-code"]],
  );
  const organizationId = organizations[0]?.id;
  if (!organizationId) {
    throw new ImportError("Organisasi tidak ditemukan atau tidak aktif.");
  }

  const { rows: existing } = await client.query(
    "select id from research.preliminary_datasets where organization_id = $1 and source_checksum = $2",
    [organizationId, plan.dataset.sourceChecksum],
  );
  if (existing[0]) return { datasetId: existing[0].id, alreadyImported: true };

  const { dataset, items, respondents } = plan;
  const {
    rows: [created],
  } = await client.query(
    `insert into research.preliminary_datasets
       (organization_id, title, item_count, max_item_score, category_scheme,
        respondent_count, source_file, source_sheet, source_checksum)
     values ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9)
     returning id`,
    [
      organizationId,
      dataset.title,
      dataset.itemCount,
      dataset.maxItemScore,
      JSON.stringify(dataset.categoryScheme),
      dataset.respondentCount,
      dataset.sourceFile,
      dataset.sourceSheet,
      dataset.sourceChecksum,
    ],
  );
  const datasetId = created.id;

  await client.query(
    `insert into research.preliminary_items
       (dataset_id, item_number, dimension, source_file, source_sheet, source_row)
     select $1, n, d, $4, $5, r
     from unnest($2::smallint[], $3::public.ct_dimension[], $6::integer[]) as x(n, d, r)`,
    [
      datasetId,
      items.map((item) => item.itemNumber),
      items.map((item) => item.dimension),
      items[0].sourceFile,
      items[0].sourceSheet,
      items.map((item) => item.sourceRow),
    ],
  );

  const { rows: inserted } = await client.query(
    `insert into research.preliminary_respondents
       (dataset_id, respondent_code, recorded_category, recorded_total,
        recorded_score, source_file, source_sheet, source_row)
     select $1, c, k, t, s, $6, $7, r
     from unnest($2::text[], $3::text[], $4::numeric[], $5::numeric[], $8::integer[])
       as x(c, k, t, s, r)
     returning id, respondent_code`,
    [
      datasetId,
      respondents.map((item) => item.code),
      respondents.map((item) => item.category),
      respondents.map((item) => item.recordedTotal),
      respondents.map((item) => item.recordedScore),
      dataset.sourceFile,
      dataset.sourceSheet,
      respondents.map((item) => item.sourceRow),
    ],
  );
  const idByCode = new Map(
    inserted.map((row) => [row.respondent_code, row.id]),
  );

  const answers = respondents.flatMap((respondent) =>
    respondent.answers.map((answer) => ({
      ...answer,
      respondentId: idByCode.get(respondent.code),
    })),
  );
  await client.query(
    `insert into research.preliminary_responses
       (respondent_id, dataset_id, item_number, answer_text, score,
        answer_column, score_column)
     select r, $1, n, a, s, ac, sc
     from unnest($2::uuid[], $3::smallint[], $4::text[], $5::smallint[], $6::text[], $7::text[])
       as x(r, n, a, s, ac, sc)`,
    [
      datasetId,
      answers.map((item) => item.respondentId),
      answers.map((item) => item.itemNumber),
      answers.map((item) => item.answer),
      answers.map((item) => item.score),
      answers.map((item) => item.answerColumn),
      answers.map((item) => item.scoreColumn),
    ],
  );

  // Pencocokan ulang: setiap jawaban dan skor yang tersimpan harus identik
  // dengan berkas sumber. Selisih satu karakter pun membatalkan transaksi.
  const { rows: stored } = await client.query(
    `select r.respondent_code, s.item_number, s.answer_text, s.score
     from research.preliminary_responses s
     join research.preliminary_respondents r on r.id = s.respondent_id
     where s.dataset_id = $1`,
    [datasetId],
  );
  const expectedAnswers = new Map(
    respondents.flatMap((respondent) =>
      respondent.answers.map((answer) => [
        `${respondent.code}#${answer.itemNumber}`,
        answer,
      ]),
    ),
  );
  const mismatched = stored.filter((row) => {
    const source = expectedAnswers.get(
      `${row.respondent_code}#${row.item_number}`,
    );
    return (
      !source || source.answer !== row.answer_text || source.score !== row.score
    );
  });
  if (
    inserted.length !== respondents.length ||
    stored.length !== answers.length ||
    mismatched.length > 0
  ) {
    throw new ImportError(
      "Hasil simpan tidak identik dengan berkas sumber; transaksi dibatalkan.",
    );
  }

  await client.query(
    `insert into public.audit_logs (action, subject_table, subject_id, after)
     values ('research_preliminary_imported', 'preliminary_datasets', $1, $2::jsonb)`,
    [
      datasetId,
      JSON.stringify({
        sourceFile: dataset.sourceFile,
        sourceSheet: dataset.sourceSheet,
        sourceChecksum: dataset.sourceChecksum,
        respondents: respondents.length,
        items: items.length,
      }),
    ],
  );

  return {
    datasetId,
    alreadyImported: false,
    respondents: inserted.length,
    responses: stored.length,
  };
}

try {
  await client.connect();
  await client.query("begin");
  const result = await writePlan();
  if (result.alreadyImported) {
    await client.query("rollback");
    console.log(
      `\nBerkas ini sudah pernah diimpor (dataset ${result.datasetId}). Tidak ada yang ditulis.\n`,
    );
  } else {
    await client.query("commit");
    console.log(
      `\n[TERSIMPAN] Dataset ${result.datasetId}: ${result.respondents} responden, ${result.responses} jawaban. Isi tersimpan identik dengan berkas sumber.\n`,
    );
  }
} catch (error) {
  await client.query("rollback").catch(() => {});
  process.exitCode = 1;
  console.error(
    error instanceof ImportError
      ? `\n[GAGAL] ${error.message}\n`
      : `\n[GAGAL] Impor dibatalkan${error?.code ? ` (SQLSTATE ${error.code})` : ""}. Tidak ada yang ditulis.\n`,
  );
} finally {
  await client.end().catch(() => {});
}
