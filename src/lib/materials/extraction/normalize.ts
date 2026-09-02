/** @format */

/**
 * Hasil ekstraksi adalah teks sumber, bukan tafsir. Normalisasi hanya
 * merapikan bentuk — akhiran baris, spasi berlebih, karakter kendali — dan
 * tidak boleh mengubah kata atau urutannya.
 */

// Batas panjang teks tersimpan. Dokumen pembelajaran yang wajar jauh di
// bawahnya; batas ini mencegah satu berkas raksasa membengkakkan kolom.
export const MAX_EXTRACTED_CHARS = 300_000;

/**
 * Di bawah ambang ini dokumen dianggap tidak berisi teks. Nilainya sengaja
 * rendah: yang ingin ditolak adalah PDF hasil pindai dan berkas kosong, bukan
 * dokumen yang memang pendek.
 */
export const MIN_MEANINGFUL_CHARS = 24;

const CONTROL_CHARACTERS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;

export function normalizeExtractedText(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(CONTROL_CHARACTERS, "")
    .replace(/\u00a0/g, " ")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Karakter yang benar-benar membawa isi; spasi dan tanda baca tidak dihitung. */
export function meaningfulLength(text: string): number {
  return text.replace(/[^\p{L}\p{N}]/gu, "").length;
}

export function capExtractedText(text: string): {
  text: string;
  truncated: boolean;
} {
  if (text.length <= MAX_EXTRACTED_CHARS) return { text, truncated: false };
  return {
    text: text.slice(0, MAX_EXTRACTED_CHARS).trimEnd(),
    truncated: true,
  };
}
