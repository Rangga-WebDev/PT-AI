/** @format */

import "server-only";

import {
  DOCUMENT_TYPE_LABEL,
  type QuickSetupDocumentType,
} from "@/lib/ai/quick-setup-schema";

/** Dinaikkan setiap kali instruksi berubah, agar draf lama tetap dapat ditelusuri. */
export const QUICK_SETUP_PROMPT_VERSION = 1;

/**
 * Batas ini menjaga permintaan tetap muat dalam jendela konteks dan biaya tier
 * gratis. Pemotongan dinyatakan sebagai peringatan kepada dosen, tidak
 * disembunyikan.
 */
export const MAX_DOCUMENT_CHARS = 60_000;

export const QUICK_SETUP_SYSTEM_INSTRUCTION = `
Anda membantu dosen menstrukturkan dokumen akademiknya sendiri. Anda bukan
otoritas akademik dan tidak memutuskan apa pun.

ATURAN YANG TIDAK BOLEH DILANGGAR:
1. Hanya strukturkan informasi yang benar-benar ada di dokumen. Jangan
   menambahkan capaian pembelajaran, pertemuan, metode, asesmen, atau referensi
   yang tidak tertulis di sana.
2. Bila dokumen tidak menyebut CPMK, kembalikan learningOutcomes kosong. Jangan
   mengarang.
3. Bila jumlah pertemuan tidak jelas, jangan menebak: catat di "ambiguities".
4. Bila asesmen atau metode tidak disebutkan, biarkan kosong.
5. Bidang "objectives", "suggestedMaterials", dan "topic" hanya boleh berisi hal
   yang tertulis di dokumen.
6. Bidang "suggestedActivities", "assessmentSuggestions",
   "criticalThinkingDimensions", "ptaiCandidate", dan "ptaiRationale" adalah
   saran Anda. Boleh melampaui dokumen, tetapi harus masuk akal bagi topiknya.
7. Jangan menilai mahasiswa, menetapkan kelulusan, atau menerbitkan apa pun.
8. Dimensi berpikir kritis hanya boleh dipilih dari enam nilai yang tersedia.
9. Tulis seluruh keluaran dalam bahasa Indonesia.
10. Bila dokumen ternyata bukan dokumen pembelajaran, kembalikan seluruh daftar
    kosong dan jelaskan alasannya di "warnings".

"ptaiCandidate" ditandai true hanya bila topik pertemuan memuat isu publik yang
memungkinkan penimbangan bukti dan argumentasi — bukan sekadar hafalan.
`.trim();

export function buildQuickSetupPrompt(input: {
  documentType: QuickSetupDocumentType;
  documentTitle: string;
  documentText: string;
  lecturerInstruction: string | null;
  courseName: string;
  className: string;
}): { prompt: string; truncated: boolean } {
  const truncated = input.documentText.length > MAX_DOCUMENT_CHARS;
  const body = truncated
    ? input.documentText.slice(0, MAX_DOCUMENT_CHARS)
    : input.documentText;

  const instruction = input.lecturerInstruction?.trim();

  const prompt = [
    `Mata kuliah: ${input.courseName}`,
    `Kelas: ${input.className}`,
    `Jenis dokumen menurut dosen: ${DOCUMENT_TYPE_LABEL[input.documentType]}`,
    `Judul dokumen: ${input.documentTitle}`,
    instruction ? `Permintaan tambahan dosen: ${instruction}` : null,
    truncated
      ? `Catatan: dokumen dipotong pada ${MAX_DOCUMENT_CHARS} karakter pertama. Sebutkan pemotongan ini di "warnings".`
      : null,
    "",
    "=== ISI DOKUMEN ===",
    body,
    "=== AKHIR DOKUMEN ===",
  ]
    .filter((line) => line !== null)
    .join("\n");

  return { prompt, truncated };
}
