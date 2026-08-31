/** @format */

import { z } from "zod";

// Struktur argumen diperluas (Lampiran 1 dan Tabel 3.7 tahap Eksplanasi).
// Tiga unsur pertama wajib; sisanya menaikkan mutu argumen tetapi tidak
// dipaksakan, agar mahasiswa tidak mengarang kontraargumen demi memenuhi form.

export const CER_ELEMENTS = [
  "claim",
  "evidence",
  "reasoning",
  "counterclaim",
  "rebuttal",
  "limitation",
  "implication",
] as const;

export type CerElement = (typeof CER_ELEMENTS)[number];

export const CER_REQUIRED: CerElement[] = ["claim", "evidence", "reasoning"];

export const CER_LABEL: Record<CerElement, string> = {
  claim: "Klaim",
  evidence: "Bukti",
  reasoning: "Penalaran",
  counterclaim: "Kontraargumen",
  rebuttal: "Sanggahan",
  limitation: "Batas kesimpulan",
  implication: "Implikasi",
};

export const CER_HINT: Record<CerElement, string> = {
  claim: "Pendirian Anda atas pertanyaan kunci kasus.",
  evidence: "Bukti dari sumber yang sudah Anda periksa.",
  reasoning: "Mengapa bukti itu menopang klaim Anda.",
  counterclaim: "Pandangan yang bertentangan dengan klaim Anda.",
  rebuttal: "Tanggapan Anda atas pandangan tersebut.",
  limitation: "Sejauh mana kesimpulan Anda berlaku, dan di mana berhenti.",
  implication: "Konsekuensi bila klaim Anda diterima.",
};

const MIN_REQUIRED = 20;
const MIN_OPTIONAL = 10;

function requiredField(label: string) {
  return z
    .string()
    .trim()
    .min(MIN_REQUIRED, `${label} minimal ${MIN_REQUIRED} karakter.`)
    .max(4000, `${label} terlalu panjang.`);
}

function optionalField(label: string) {
  return z
    .string()
    .trim()
    .max(4000, `${label} terlalu panjang.`)
    .refine(
      (value) => value.length === 0 || value.length >= MIN_OPTIONAL,
      `${label} minimal ${MIN_OPTIONAL} karakter bila diisi.`,
    );
}

export const cerElementsSchema = z.object({
  claim: requiredField(CER_LABEL.claim),
  evidence: requiredField(CER_LABEL.evidence),
  reasoning: requiredField(CER_LABEL.reasoning),
  counterclaim: optionalField(CER_LABEL.counterclaim),
  rebuttal: optionalField(CER_LABEL.rebuttal),
  limitation: optionalField(CER_LABEL.limitation),
  implication: optionalField(CER_LABEL.implication),
});

export type CerElements = z.infer<typeof cerElementsSchema>;

export const submitCerSchema = z.object({
  activityId: z.string().uuid("Aktivitas tidak valid."),
  clientSubmissionId: z.string().uuid("Penanda kiriman tidak valid."),
  elements: cerElementsSchema,
});

/**
 * Narasi gabungan menjadi isi kanonik `attempts.content`, sehingga umpan balik
 * AI, diff revisi, dan penilaian dosen tetap membaca satu teks utuh seperti
 * pada aktivitas naratif.
 */
export function composeCerNarrative(elements: CerElements): string {
  return CER_ELEMENTS.filter((key) => elements[key].trim().length > 0)
    .map((key) => `${CER_LABEL[key]}: ${elements[key].trim()}`)
    .join("\n\n");
}

export function emptyCerElements(): CerElements {
  return {
    claim: "",
    evidence: "",
    reasoning: "",
    counterclaim: "",
    rebuttal: "",
    limitation: "",
    implication: "",
  };
}
