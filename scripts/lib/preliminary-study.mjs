/** @format */

// Logika murni impor studi pendahuluan: parser CSV, pemetaan kisi-kisi,
// validasi silang, dan penyusunan baris. Tidak menyentuh basis data maupun
// sistem berkas agar dapat diuji tanpa efek samping.
//
// Tidak ada nilai yang dikarang atau dibetulkan. Satu galat saja membuat
// seluruh impor ditolak, dan laporan menyebut nomor baris serta kolom tanpa
// pernah mencetak isi jawaban.

import { createHash } from "node:crypto";

export const DEFAULT_EXPECTED_RESPONDENTS = 50;
export const DEFAULT_TITLE = "Tes kemampuan berpikir kritis kewarganegaraan";
export const MAX_ITEM_SCORE = 4;

// Rentang kategori penelitian (sheet "Ringkasan Data"): Rendah < 60,
// Sedang 60–79,99, Tinggi ≥ 80 pada skala 0–100. Batas bawah inklusif,
// batas atas eksklusif kecuali rentang terakhir.
export const CATEGORY_SCHEME = Object.freeze([
  Object.freeze({ label: "Rendah", min: 0, max: 60 }),
  Object.freeze({ label: "Sedang", min: 60, max: 80 }),
  Object.freeze({ label: "Tinggi", min: 80, max: 100 }),
]);

const SKILL_DIMENSION = new Map([
  ["interpretasi", "interpretation"],
  ["analisis", "analysis"],
  ["evaluasi", "evaluation"],
  ["inferensi", "inference"],
  ["eksplanasi", "explanation"],
  ["regulasi diri", "self_regulation"],
]);

export const DIMENSION_LABEL = Object.freeze({
  interpretation: "Interpretasi",
  analysis: "Analisis",
  evaluation: "Evaluasi",
  inference: "Inferensi",
  explanation: "Eksplanasi",
  self_regulation: "Regulasi diri",
});

const CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,31}$/;

export function normalizeHeader(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

// Excel berlokal Indonesia menulis CSV dengan titik koma; ekspor lain koma.
function detectDelimiter(text) {
  let commas = 0;
  let semicolons = 0;
  let quoted = false;
  for (const char of text) {
    if (char === '"') quoted = !quoted;
    else if (!quoted && (char === "\n" || char === "\r")) break;
    else if (!quoted && char === ",") commas += 1;
    else if (!quoted && char === ";") semicolons += 1;
  }
  return semicolons > commas ? ";" : ",";
}

/** RFC 4180: kutip ganda, kutip lolos (""), pemisah dan baris baru di dalam sel. */
export function parseCsv(text) {
  const source = text.startsWith("\uFEFF") ? text.slice(1) : text;
  const delimiter = detectDelimiter(source);
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char !== '"') field += char;
      else if (source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else quoted = false;
    } else if (char === '"' && field === "") {
      quoted = true;
    } else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && source[index + 1] === "\n") index += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (quoted) throw new Error("csv_unterminated_quote");
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function parseNumber(raw) {
  const value = String(raw ?? "")
    .trim()
    .replace(",", ".");
  return /^\d+(\.\d+)?$/.test(value) ? Number(value) : null;
}

function parseScore(raw) {
  const value = String(raw ?? "").trim();
  return /^\d+$/.test(value) ? Number(value) : null;
}

/** Nilai 0–100 dua desimal, dihitung dengan bilangan bulat agar bebas galat pembulatan biner. */
export function scaledScore(total, maxTotal) {
  return Math.round((total * 10000) / maxTotal) / 100;
}

export function categoryFor(score, scheme = CATEGORY_SCHEME) {
  const band = scheme.find(
    (item, index) =>
      score >= item.min &&
      (score < item.max || (index === scheme.length - 1 && score <= item.max)),
  );
  return band?.label ?? null;
}

/**
 * Nama sheet dari nama berkas ekspor "<buku kerja>-<sheet>.csv": bagian
 * bersama kedua berkas sampai tanda hubung terakhirnya adalah nama buku kerja.
 */
export function deriveSheetNames(first, second) {
  const a = first.replace(/\.csv$/i, "");
  const b = second.replace(/\.csv$/i, "");
  let length = 0;
  while (length < a.length && length < b.length && a[length] === b[length]) {
    length += 1;
  }
  const cut = a.slice(0, length).lastIndexOf("-") + 1;
  return [a.slice(cut) || a, b.slice(cut) || b];
}

export function parseBlueprint(rows) {
  const issues = [];
  const headerIndex = rows.findIndex((row) =>
    row.some((cell) => normalizeHeader(cell) === "nomor butir"),
  );
  if (headerIndex === -1) {
    return {
      items: [],
      issues: ["Kisi-kisi: kolom 'Nomor Butir' tidak ditemukan."],
    };
  }

  const header = rows[headerIndex].map(normalizeHeader);
  const itemColumn = header.indexOf("nomor butir");
  const skillColumn = header.findIndex((cell) => cell.startsWith("kecakapan"));
  if (skillColumn === -1) {
    return {
      items: [],
      issues: ["Kisi-kisi: kolom 'Kecakapan' tidak ditemukan."],
    };
  }

  const items = [];
  for (let index = headerIndex + 1; index < rows.length; index += 1) {
    const row = rows[index];
    const line = index + 1;
    const skill = normalizeHeader(row[skillColumn]);
    const numbers = String(row[itemColumn] ?? "").trim();
    if (!skill && !numbers) continue;

    const dimension = SKILL_DIMENSION.get(skill);
    if (!dimension) {
      issues.push(`Kisi-kisi baris ${line}: kecakapan tidak dikenal.`);
      continue;
    }
    const parts = numbers.split(/[,;/]/).map((part) => part.trim());
    if (!numbers || parts.some((part) => !/^\d+$/.test(part))) {
      issues.push(`Kisi-kisi baris ${line}: nomor butir tidak valid.`);
      continue;
    }
    for (const part of parts) {
      items.push({ itemNumber: Number(part), dimension, sourceRow: line });
    }
  }

  items.sort((left, right) => left.itemNumber - right.itemNumber);
  return { items, issues };
}

export function parseAnswers(rows) {
  const [headerRow = [], ...body] = rows;
  const header = headerRow.map(normalizeHeader);
  const issues = [];
  const required = {
    id: header.indexOf("id"),
    category: header.indexOf("kategori"),
    total: header.indexOf("total skor"),
    score: header.indexOf("nilai (0-100)"),
  };
  const labels = {
    id: "ID",
    category: "Kategori",
    total: "Total Skor",
    score: "Nilai (0-100)",
  };
  for (const [key, index] of Object.entries(required)) {
    if (index === -1) issues.push(`Kolom '${labels[key]}' tidak ditemukan.`);
  }

  const answerColumns = new Map();
  const scoreColumns = new Map();
  header.forEach((cell, index) => {
    const answer = /^soal (\d+)$/.exec(cell);
    if (answer) answerColumns.set(Number(answer[1]), index);
    const score = /^skor (\d+)$/.exec(cell);
    if (score) scoreColumns.set(Number(score[1]), index);
  });

  const itemCount = answerColumns.size;
  for (let item = 1; item <= itemCount; item += 1) {
    if (!answerColumns.has(item))
      issues.push(`Kolom 'Soal ${item}' tidak ditemukan.`);
    if (!scoreColumns.has(item))
      issues.push(`Kolom 'Skor ${item}' tidak ditemukan.`);
  }
  if (scoreColumns.size !== itemCount) {
    issues.push(
      `Jumlah kolom skor (${scoreColumns.size}) tidak sama dengan kolom soal (${itemCount}).`,
    );
  }
  if (itemCount === 0) issues.push("Tidak ada kolom 'Soal N'.");
  if (issues.length > 0) return { itemCount, respondents: [], issues };

  const respondents = [];
  body.forEach((row, offset) => {
    const line = offset + 2;
    if (row.every((cell) => cell.trim() === "")) return;
    if (row.length !== headerRow.length) {
      issues.push(
        `Baris ${line}: ${row.length} kolom, seharusnya ${headerRow.length}.`,
      );
      return;
    }
    const answers = [];
    for (let item = 1; item <= itemCount; item += 1) {
      const answerIndex = answerColumns.get(item);
      const scoreIndex = scoreColumns.get(item);
      answers.push({
        itemNumber: item,
        answer: row[answerIndex],
        score: parseScore(row[scoreIndex]),
        answerColumn: headerRow[answerIndex].trim(),
        scoreColumn: headerRow[scoreIndex].trim(),
      });
    }
    respondents.push({
      sourceRow: line,
      code: row[required.id].trim(),
      category: row[required.category].trim(),
      recordedTotal: parseNumber(row[required.total]),
      recordedScore: parseNumber(row[required.score]),
      answers,
    });
  });

  return { itemCount, respondents, issues };
}

function validateRespondent(respondent, itemCount, errors) {
  const line = respondent.sourceRow;
  if (!CODE_PATTERN.test(respondent.code)) {
    errors.push(`Baris ${line}: ID responden tidak valid.`);
  }

  let total = 0;
  for (const answer of respondent.answers) {
    if (answer.score === null || answer.score > MAX_ITEM_SCORE) {
      errors.push(
        `Baris ${line}, ${answer.scoreColumn}: bukan skor bulat 0–${MAX_ITEM_SCORE}.`,
      );
      continue;
    }
    total += answer.score;
    if (answer.answer.trim() === "" && answer.score > 0) {
      errors.push(
        `Baris ${line}, ${answer.answerColumn}: jawaban kosong tetapi skornya ${answer.score}.`,
      );
    }
  }

  const maxTotal = itemCount * MAX_ITEM_SCORE;
  const score = scaledScore(total, maxTotal);
  if (respondent.recordedTotal === null) {
    errors.push(`Baris ${line}: Total Skor bukan angka.`);
  } else if (respondent.recordedTotal !== total) {
    errors.push(
      `Baris ${line}: Total Skor ${respondent.recordedTotal} tidak sama dengan jumlah skor butir ${total}.`,
    );
  }
  if (respondent.recordedScore === null) {
    errors.push(`Baris ${line}: Nilai (0-100) bukan angka.`);
  } else if (Math.abs(respondent.recordedScore - score) > 0.005) {
    errors.push(
      `Baris ${line}: Nilai ${respondent.recordedScore} tidak sama dengan ${score} (total ${total} dari ${maxTotal}).`,
    );
  }

  const labels = CATEGORY_SCHEME.map((band) => band.label);
  if (!labels.includes(respondent.category)) {
    errors.push(`Baris ${line}: kategori tidak dikenal.`);
  } else if (categoryFor(score) !== respondent.category) {
    errors.push(
      `Baris ${line}: kategori ${respondent.category} tidak sesuai nilai ${score} (seharusnya ${categoryFor(score)}).`,
    );
  }
}

// Temuan mutu data yang tidak menghentikan impor: jawaban asli tetap disimpan
// apa adanya, tetapi pola ini perlu diketahui sebelum dianalisis.
function answerPatternWarnings(respondents, itemCount) {
  const warnings = [];
  for (let item = 1; item <= itemCount; item += 1) {
    const scoresByText = new Map();
    for (const respondent of respondents) {
      const answer = respondent.answers[item - 1];
      if (!answer || answer.answer.trim() === "") continue;
      const scores = scoresByText.get(answer.answer) ?? new Set();
      scores.add(answer.score);
      scoresByText.set(answer.answer, scores);
    }
    const answered = respondents.filter(
      (respondent) => respondent.answers[item - 1]?.answer.trim() !== "",
    ).length;
    if (scoresByText.size < answered) {
      warnings.push(
        `Soal ${item}: ${answered} jawaban hanya berisi ${scoresByText.size} teks berbeda.`,
      );
    }
    const conflicting = [...scoresByText.values()].filter(
      (scores) => scores.size > 1,
    ).length;
    if (conflicting > 0) {
      warnings.push(
        `Soal ${item}: ${conflicting} teks jawaban identik diberi skor berbeda.`,
      );
    }
  }
  return warnings;
}

function decode(bytes, label, errors) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    errors.push(
      `${label}: berkas bukan UTF-8. Ekspor ulang sebagai CSV UTF-8.`,
    );
    return null;
  }
}

function parse(text, label, errors) {
  try {
    return parseCsv(text);
  } catch {
    errors.push(`${label}: tanda kutip tidak tertutup.`);
    return null;
  }
}

export function buildImportPlan({
  answers,
  blueprint,
  expectedRespondents = DEFAULT_EXPECTED_RESPONDENTS,
  title = DEFAULT_TITLE,
}) {
  const errors = [];
  const answersText = decode(answers.bytes, "Berkas jawaban", errors);
  const blueprintText = decode(blueprint.bytes, "Berkas kisi-kisi", errors);
  const answerRows =
    answersText === null ? null : parse(answersText, "Berkas jawaban", errors);
  const blueprintRows =
    blueprintText === null
      ? null
      : parse(blueprintText, "Berkas kisi-kisi", errors);

  const parsed = answerRows
    ? parseAnswers(answerRows)
    : { itemCount: 0, respondents: [], issues: [] };
  const mapping = blueprintRows
    ? parseBlueprint(blueprintRows)
    : { items: [], issues: [] };
  errors.push(...parsed.issues, ...mapping.issues);

  const { itemCount, respondents } = parsed;
  if (answerRows && parsed.issues.length === 0) {
    if (respondents.length !== expectedRespondents) {
      errors.push(
        `Jumlah responden ${respondents.length}, seharusnya ${expectedRespondents}.`,
      );
    }
    const rowsByCode = new Map();
    for (const respondent of respondents) {
      const rowsForCode = rowsByCode.get(respondent.code) ?? [];
      rowsForCode.push(respondent.sourceRow);
      rowsByCode.set(respondent.code, rowsForCode);
      validateRespondent(respondent, itemCount, errors);
    }
    for (const [code, lines] of rowsByCode) {
      if (lines.length > 1)
        errors.push(
          `ID ${code} muncul lebih dari sekali (baris ${lines.join(", ")}).`,
        );
    }
  }

  if (blueprintRows && mapping.issues.length === 0 && itemCount > 0) {
    const counts = new Map();
    for (const item of mapping.items)
      counts.set(item.itemNumber, (counts.get(item.itemNumber) ?? 0) + 1);
    for (let item = 1; item <= itemCount; item += 1) {
      const count = counts.get(item) ?? 0;
      if (count === 0)
        errors.push(`Kisi-kisi: Soal ${item} tidak dipetakan ke kecakapan.`);
      if (count > 1)
        errors.push(`Kisi-kisi: Soal ${item} dipetakan lebih dari sekali.`);
    }
    for (const number of counts.keys()) {
      if (number < 1 || number > itemCount)
        errors.push(`Kisi-kisi: Soal ${number} tidak ada di berkas jawaban.`);
    }
  }

  const warnings =
    errors.length === 0 ? answerPatternWarnings(respondents, itemCount) : [];
  const categories = CATEGORY_SCHEME.map((band) => ({
    label: band.label,
    count: respondents.filter((item) => item.category === band.label).length,
  }));

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    dataset: {
      title,
      itemCount,
      maxItemScore: MAX_ITEM_SCORE,
      categoryScheme: CATEGORY_SCHEME,
      respondentCount: respondents.length,
      sourceFile: answers.fileName,
      sourceSheet: answers.sheetName,
      sourceChecksum: createHash("sha256").update(answers.bytes).digest("hex"),
    },
    items: mapping.items.map((item) => ({
      ...item,
      sourceFile: blueprint.fileName,
      sourceSheet: blueprint.sheetName,
    })),
    respondents: respondents.map((respondent) => ({
      ...respondent,
      sourceFile: answers.fileName,
      sourceSheet: answers.sheetName,
    })),
    summary: { expectedRespondents, categories },
  };
}

export function formatReport(plan, { answersPath, blueprintPath } = {}) {
  const { dataset } = plan;
  const byDimension = new Map();
  for (const item of plan.items) {
    const numbers = byDimension.get(item.dimension) ?? [];
    numbers.push(item.itemNumber);
    byDimension.set(item.dimension, numbers);
  }
  const lines = [
    "Studi pendahuluan — pemeriksaan impor",
    `  Berkas jawaban   : ${answersPath ?? dataset.sourceFile}`,
    `  Sheet jawaban    : ${dataset.sourceSheet}`,
    `  Berkas kisi-kisi : ${blueprintPath ?? plan.items[0]?.sourceFile ?? "-"}`,
    `  Checksum SHA-256 : ${dataset.sourceChecksum}`,
    `  Responden        : ${dataset.respondentCount} (diharapkan ${plan.summary.expectedRespondents})`,
    `  Soal             : ${dataset.itemCount}, skor 0–${dataset.maxItemScore}, total maksimum ${dataset.itemCount * dataset.maxItemScore}`,
    `  Pemetaan         : ${
      [...byDimension]
        .map(
          ([dimension, numbers]) =>
            `${DIMENSION_LABEL[dimension]} (soal ${numbers.join(", ")})`,
        )
        .join(" · ") || "-"
    }`,
    `  Kategori tercatat: ${plan.summary.categories
      .map((item) => `${item.label} ${item.count}`)
      .join(" · ")}`,
  ];
  if (plan.errors.length > 0) {
    lines.push("", `Galat (${plan.errors.length}) — impor ditolak:`);
    for (const error of plan.errors) lines.push(`  - ${error}`);
  }
  if (plan.warnings.length > 0) {
    lines.push("", "Catatan mutu data (tidak menghentikan impor):");
    for (const warning of plan.warnings) lines.push(`  - ${warning}`);
  }
  return lines.join("\n");
}
