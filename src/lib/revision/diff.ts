/** @format */

export type DiffOp = "equal" | "insert" | "delete";

export interface DiffSegment {
  op: DiffOp;
  text: string;
}

export interface DiffSummary {
  addedWords: number;
  removedWords: number;
  keptWords: number;
  changeRatio: number;
}

/**
 * Pemisahan mempertahankan spasi sebagai token sendiri supaya penggabungan
 * kembali menghasilkan teks yang identik dengan aslinya.
 */
function tokenize(text: string): string[] {
  return text.match(/\s+|[^\s]+/g) ?? [];
}

function isWord(token: string): boolean {
  return !/^\s+$/.test(token);
}

/** Panjang LCS untuk setiap pasangan sufiks; dasar penelusuran diff. */
function buildLcsTable(a: string[], b: string[]): Uint32Array[] {
  const table: Uint32Array[] = Array.from(
    { length: a.length + 1 },
    () => new Uint32Array(b.length + 1),
  );

  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      table[i]![j] =
        a[i] === b[j]
          ? table[i + 1]![j + 1]! + 1
          : Math.max(table[i + 1]![j]!, table[i]![j + 1]!);
    }
  }

  return table;
}

function pushSegment(segments: DiffSegment[], op: DiffOp, text: string): void {
  const last = segments[segments.length - 1];
  if (last && last.op === op) {
    last.text += text;
    return;
  }
  segments.push({ op, text });
}

/**
 * Diff kata-per-kata antara respons awal dan revisi. Dihitung di sini, bukan
 * di database, agar dapat diuji tanpa I/O dan agar teks asli tidak pernah
 * ditulis ulang — jejak berpikir mahasiswa tetap utuh (LOCK-PED-004).
 */
export function diffWords(before: string, after: string): DiffSegment[] {
  const a = tokenize(before);
  const b = tokenize(after);
  const table = buildLcsTable(a, b);
  const segments: DiffSegment[] = [];

  let i = 0;
  let j = 0;

  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      pushSegment(segments, "equal", a[i]!);
      i += 1;
      j += 1;
    } else if (table[i + 1]![j]! >= table[i]![j + 1]!) {
      pushSegment(segments, "delete", a[i]!);
      i += 1;
    } else {
      pushSegment(segments, "insert", b[j]!);
      j += 1;
    }
  }

  while (i < a.length) {
    pushSegment(segments, "delete", a[i]!);
    i += 1;
  }
  while (j < b.length) {
    pushSegment(segments, "insert", b[j]!);
    j += 1;
  }

  return segments;
}

export function summarizeDiff(segments: DiffSegment[]): DiffSummary {
  let addedWords = 0;
  let removedWords = 0;
  let keptWords = 0;

  for (const segment of segments) {
    const words = tokenize(segment.text).filter(isWord).length;
    if (segment.op === "insert") addedWords += words;
    else if (segment.op === "delete") removedWords += words;
    else keptWords += words;
  }

  const total = addedWords + removedWords + keptWords;

  return {
    addedWords,
    removedWords,
    keptWords,
    changeRatio: total === 0 ? 0 : (addedWords + removedWords) / total,
  };
}
