/** @format */

import type { CtDimension } from "@/lib/constants/stages";

/**
 * Naikkan versi ini setiap kali deskriptor berubah, supaya penilaian lama
 * tetap dapat ditelusuri ke rumusan yang berlaku saat itu.
 */
export const PTAI_CT_RUBRIC_VERSION = 1;

export const PTAI_CT_RUBRIC_TITLE = "Rubrik Standar Berpikir Kritis PT-AI";

export const PTAI_CT_RUBRIC_DESCRIPTION =
  "Rubrik analitik enam dimensi berpikir kritis dengan level 0–4. Nilai akhir dihitung dari level tiap kriteria dan bobotnya, bukan dari angka bebas.";

export const PTAI_CT_MAX_LEVEL = 4;

export interface RubricTemplateLevel {
  score: number;
  label: string;
  descriptor: string;
}

export interface RubricTemplateCriterion {
  dimension: CtDimension;
  code: string;
  title: string;
  focus: string;
  weight: number;
  levels: RubricTemplateLevel[];
}

type FiveDescriptors = readonly [string, string, string, string, string];

const levels = (descriptors: FiveDescriptors): RubricTemplateLevel[] => [
  { score: 0, label: "Tidak terlihat", descriptor: descriptors[0] },
  { score: 1, label: "Sangat terbatas", descriptor: descriptors[1] },
  { score: 2, label: "Berkembang", descriptor: descriptors[2] },
  { score: 3, label: "Baik", descriptor: descriptors[3] },
  { score: 4, label: "Sangat baik", descriptor: descriptors[4] },
];

/**
 * Sumber tunggal deskriptor PT-AI. UI, layanan pembuatan rubrik, dan pengujian
 * membaca dari sini; tidak ada salinan deskriptor di tempat lain.
 */
export const PTAI_CT_CRITERIA: readonly RubricTemplateCriterion[] = [
  {
    dimension: "interpretation",
    code: "CT_INTERPRETATION",
    title: "Interpretasi",
    focus:
      "Kemampuan memahami masalah, konteks, istilah penting, serta pihak atau posisi yang terlibat.",
    weight: 1,
    levels: levels([
      "Tidak menunjukkan pemahaman terhadap masalah atau konteks yang diberikan.",
      "Menyebut sebagian unsur masalah tetapi banyak konteks, istilah, atau pihak penting tidak dikenali atau keliru.",
      "Mengidentifikasi masalah utama dan sebagian konteks dengan benar, tetapi masih terdapat unsur penting yang belum dijelaskan.",
      "Menjelaskan masalah, konteks, istilah penting, dan pihak terkait secara tepat dan cukup lengkap.",
      "Menafsirkan masalah secara utuh dan presisi, membedakan unsur penting, serta menjelaskan hubungan konteks yang relevan.",
    ]),
  },
  {
    dimension: "analysis",
    code: "CT_ANALYSIS",
    title: "Analisis",
    focus:
      "Kemampuan mengidentifikasi klaim, alasan, asumsi, dan hubungan antarbagian argumen.",
    weight: 1,
    levels: levels([
      "Tidak mengidentifikasi klaim, alasan, asumsi, atau hubungan argumen.",
      "Mengidentifikasi sebagian klaim tetapi hubungan antara alasan dan kesimpulan tidak jelas.",
      "Mengidentifikasi klaim dan beberapa alasan, tetapi asumsi atau hubungan antarargumen masih belum lengkap.",
      "Menguraikan klaim, alasan, asumsi, dan hubungan argumen secara cukup tepat dan terstruktur.",
      "Menganalisis struktur argumen secara lengkap, termasuk asumsi tersirat, hubungan antarklaim, serta kekuatan atau kelemahan struktur penalarannya.",
    ]),
  },
  {
    dimension: "evaluation",
    code: "CT_EVALUATION",
    title: "Evaluasi",
    focus:
      "Kemampuan menilai kredibilitas sumber, kualitas bukti, relevansi, bias, dan kecukupan dukungan terhadap klaim.",
    weight: 1,
    levels: levels([
      "Tidak melakukan penilaian terhadap sumber atau bukti yang digunakan.",
      "Memberikan penilaian sederhana terhadap sumber atau bukti tanpa alasan yang memadai.",
      "Menilai sebagian aspek kredibilitas atau relevansi bukti, tetapi belum konsisten atau belum membandingkan kekuatan sumber.",
      "Menilai kredibilitas, relevansi, dan kualitas bukti dengan alasan yang cukup serta mengenali kelemahan atau bias penting.",
      "Mengevaluasi bukti secara kritis dan komprehensif, membandingkan sumber, mengenali bias atau kekosongan bukti, serta menentukan tingkat dukungan bukti terhadap klaim secara proporsional.",
    ]),
  },
  {
    dimension: "inference",
    code: "CT_INFERENCE",
    title: "Inferensi",
    focus:
      "Kemampuan menarik kesimpulan yang didukung bukti, mempertimbangkan alternatif, dan melihat konsekuensi.",
    weight: 1,
    levels: levels([
      "Tidak menghasilkan kesimpulan yang dapat ditelusuri dari bukti atau alasan.",
      "Menarik kesimpulan tetapi hubungannya dengan bukti lemah atau tidak dijelaskan.",
      "Menghasilkan kesimpulan yang cukup berhubungan dengan bukti tetapi alternatif atau konsekuensi belum dipertimbangkan dengan baik.",
      "Menarik kesimpulan yang logis berdasarkan bukti dan mempertimbangkan alternatif atau konsekuensi yang relevan.",
      "Menghasilkan kesimpulan yang kuat dan proporsional terhadap bukti, membandingkan alternatif secara kritis, serta mempertimbangkan implikasi dan keterbatasan kesimpulan.",
    ]),
  },
  {
    dimension: "explanation",
    code: "CT_EXPLANATION",
    title: "Eksplanasi",
    focus:
      "Kemampuan menjelaskan dan mempertanggungjawabkan keputusan atau argumen secara koheren.",
    weight: 1,
    levels: levels([
      "Tidak memberikan penjelasan atau alasan yang mendukung kesimpulan.",
      "Memberikan alasan sederhana tetapi hubungan antara klaim, bukti, dan kesimpulan tidak jelas.",
      "Argumen mulai memiliki hubungan antara klaim, alasan, dan bukti tetapi masih kurang runtut atau lengkap.",
      "Menjelaskan posisi secara runtut dengan hubungan yang jelas antara klaim, alasan, bukti, dan kesimpulan.",
      "Menyampaikan argumentasi yang sangat koheren, berbasis bukti, mempertimbangkan keterbatasan atau kontraargumen, serta mampu mempertanggungjawabkan kesimpulannya dengan jelas.",
    ]),
  },
  {
    dimension: "self_regulation",
    code: "CT_SELF_REGULATION",
    title: "Regulasi diri",
    focus:
      "Kemampuan merefleksikan, memeriksa ulang, menemukan kekurangan, dan memperbaiki proses berpikirnya sendiri.",
    weight: 1,
    levels: levels([
      "Tidak menunjukkan refleksi atau koreksi terhadap proses berpikir.",
      "Mengakui adanya perubahan atau kekurangan tetapi tidak menjelaskan alasan maupun perbaikannya.",
      "Mengidentifikasi sebagian kekurangan dalam respons awal dan melakukan revisi, tetapi refleksinya masih terbatas.",
      "Menjelaskan kekurangan pemikiran sebelumnya, alasan perubahan, dan melakukan revisi yang relevan berdasarkan bukti atau umpan balik.",
      "Secara kritis mengevaluasi pemikirannya sendiri, mengidentifikasi bias/asumsi/kesalahan, menjelaskan alasan perubahan, dan menunjukkan revisi substantif yang meningkatkan kualitas penalaran.",
    ]),
  },
];
