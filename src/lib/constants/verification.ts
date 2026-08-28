/** @format */

import type { Database } from "@/lib/supabase/types";

export type SourceType = Database["public"]["Enums"]["source_type"];
export type VerificationVerdict =
  Database["public"]["Enums"]["verification_verdict"];
export type ClaimLinkType = Database["public"]["Enums"]["claim_link_type"];

/**
 * Enam kriteria LOCK-PED-007. Kunci mengikuti constraint
 * `ck_source_verifications_checklist` di database dan tidak boleh diubah
 * tanpa migration baru.
 */
export const VERIFICATION_CRITERIA = [
  {
    key: "credibility",
    label: "Kredibilitas",
    question: "Siapa penulis atau lembaganya, dan apa dasar kewenangannya?",
  },
  {
    key: "relevance",
    label: "Relevansi",
    question: "Apakah isi sumber menjawab pertanyaan kasus yang sedang dikaji?",
  },
  {
    key: "sufficiency",
    label: "Kecukupan",
    question: "Apakah bukti yang disajikan memadai untuk menopang klaim?",
  },
  {
    key: "traceability",
    label: "Keterlacakan",
    question: "Dapatkah data atau kutipan ditelusuri ke sumber aslinya?",
  },
  {
    key: "consistency",
    label: "Konsistensi",
    question: "Apakah isinya konsisten dengan sumber lain yang kredibel?",
  },
  {
    key: "bias",
    label: "Potensi bias",
    question:
      "Adakah kepentingan atau sudut pandang yang memengaruhi penyajian?",
  },
] as const;

export const CRITERION_KEYS = VERIFICATION_CRITERIA.map(
  (criterion) => criterion.key,
);

export const SOURCE_TYPE_LABEL: Record<SourceType, string> = {
  regulation: "Peraturan",
  official_document: "Dokumen resmi",
  journal_article: "Artikel jurnal",
  book: "Buku",
  news: "Berita",
  report: "Laporan",
  dataset: "Set data",
  other: "Lainnya",
};

export const VERDICT_LABEL: Record<VerificationVerdict, string> = {
  credible: "Kredibel",
  questionable: "Perlu ditelaah",
  not_usable: "Tidak layak dipakai",
};

export const LINK_TYPE_LABEL: Record<ClaimLinkType, string> = {
  supports: "Mendukung",
  refutes: "Membantah",
  contextualizes: "Memberi konteks",
};
