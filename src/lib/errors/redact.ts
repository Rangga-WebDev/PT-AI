/** @format */

/**
 * Log server menyimpan sebab, bukan isi. Pesan galat PostgreSQL kerap membawa
 * nilai kolom yang memicunya — surel, NIM, atau petikan jawaban mahasiswa —
 * dan nilai itu tidak boleh ikut tersimpan hanya demi kemudahan diagnosis.
 */

const MAX_LENGTH = 300;
const MASK = "\u2026";

const RULES: [RegExp, string][] = [
  // Detail unique/foreign key: "Key (kolom)=(nilai) already exists."
  [/=\([^)]*\)/g, `=(${MASK})`],
  // Nilai berkutip pada pesan check constraint dan cast.
  [/'[^']*'/g, `'${MASK}'`],
  [/"[^"]{24,}"/g, `"${MASK}"`],
  // Jaring pengaman untuk pengenal pribadi yang lolos pola di atas.
  [/[\w.+-]+@[\w-]+\.[\w.-]+/g, MASK],
  [/\b\d{6,}\b/g, MASK],
];

export function redactDatabaseDetail(
  value: string | null | undefined,
): string | null {
  if (!value) return null;

  let result = value;
  for (const [pattern, replacement] of RULES) {
    result = result.replace(pattern, replacement);
  }

  return result.length > MAX_LENGTH
    ? `${result.slice(0, MAX_LENGTH)}${MASK}`
    : result;
}

export interface RedactedError {
  name: string;
  message: string | null;
  frame: string | null;
}

/**
 * Galat tak terduga dicatat sebagai tiga keping saja. Objeknya tidak pernah
 * dicetak utuh karena dapat membawa payload permintaan.
 */
export function redactUnexpected(error: unknown): RedactedError {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: redactDatabaseDetail(error.message),
      frame:
        error.stack
          ?.split("\n")
          .slice(1, 4)
          .map((line) => line.trim())
          .join(" | ") ?? null,
    };
  }

  return {
    name: typeof error,
    message: redactDatabaseDetail(
      typeof error === "string" ? error : String(error),
    ),
    frame: null,
  };
}
