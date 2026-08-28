/** @format */

export const RESEARCH_DATASETS = [
  "attempt_metrics",
  "ct_scores",
  "ai_usage",
] as const;

export type ResearchDataset = (typeof RESEARCH_DATASETS)[number];

export function isResearchDataset(value: string): value is ResearchDataset {
  return (RESEARCH_DATASETS as readonly string[]).includes(value);
}

// Kolom yang dilarang muncul di ekspor. Diperiksa saat serialisasi, bukan hanya
// dipercayakan pada definisi view, agar perubahan view di kemudian hari tidak
// diam-diam membocorkan identitas.
const FORBIDDEN_COLUMNS = [
  "full_name",
  "identifier",
  "email",
  "student_id",
  "profile_id",
  "reporter_id",
  "author_id",
];

export interface CsvResult {
  ok: boolean;
  csv?: string;
  error?: string;
}

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/**
 * Serialisasi CSV yang menolak bekerja bila ada kolom beridentitas. Kegagalan
 * di sini lebih baik daripada berkas ekspor yang membocorkan mahasiswa.
 */
export function toCsv(rows: Record<string, unknown>[]): CsvResult {
  if (rows.length === 0) return { ok: true, csv: "" };

  const columns = Object.keys(rows[0]!);
  const leaked = columns.filter((column) =>
    FORBIDDEN_COLUMNS.includes(column.toLowerCase()),
  );

  if (leaked.length > 0) {
    return {
      ok: false,
      error: `Ekspor dibatalkan: kolom beridentitas ditemukan (${leaked.join(", ")}).`,
    };
  }

  if (!columns.includes("pseudonym")) {
    return {
      ok: false,
      error: "Ekspor dibatalkan: kolom pseudonym tidak ditemukan.",
    };
  }

  const header = columns.map(escapeCell).join(",");
  const body = rows
    .map((row) => columns.map((column) => escapeCell(row[column])).join(","))
    .join("\n");

  return { ok: true, csv: `${header}\n${body}` };
}
