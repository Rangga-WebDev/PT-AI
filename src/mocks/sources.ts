/** @format */

// MOCK — data contoh untuk prototipe visual PHASE 3.

import type { SourceItem, VerificationCriterion } from "@/types/learning";

export const MOCK_SOURCES: SourceItem[] = [
  {
    id: "sumber-perwali",
    title:
      "Peraturan Wali Kota Sukamaju Nomor 14 Tahun 2025 tentang Tata Cara Konsultasi Publik",
    publisher: "Pemerintah Kota Sukamaju (contoh)",
    authors: "Bagian Hukum Sekretariat Daerah",
    publishedAt: "12 Maret 2025",
    accessedAt: "5 Agustus 2026",
    sourceType: "Dokumen regulasi",
    url: "https://contoh.invalid/perwali-14-2025",
    version: "v1 — dokumen asli",
    credibility: "tinggi",
    verified: true,
    excerpt: [
      "Pengumuman konsultasi publik dilakukan paling singkat tujuh hari kerja sebelum pelaksanaan.",
      "Penyelenggara wajib menyusun risalah tanggapan atas masukan yang diterima.",
    ],
  },
  {
    id: "sumber-catatan-osm",
    title: "Catatan Pemantauan Konsultasi Publik Ruang Terbuka Hijau",
    publisher: "Lembaga Pemantau Kebijakan Warga (contoh)",
    authors: "Tim Pemantau Kebijakan",
    publishedAt: "2 Juli 2026",
    accessedAt: "5 Agustus 2026",
    sourceType: "Laporan organisasi masyarakat sipil",
    url: "https://contoh.invalid/catatan-pemantauan",
    version: "v2 — revisi metodologi",
    credibility: "sedang",
    verified: false,
    excerpt: [
      "Dari 31 masukan tertulis, 19 di antaranya tidak memperoleh tanggapan tertulis hingga tanggal pemantauan.",
      "Metode pemantauan berupa penelusuran dokumen publik dan wawancara terbatas.",
    ],
  },
  {
    id: "sumber-berita-daring",
    title: "Warga Disebut Mayoritas Dukung Rancangan Peraturan Daerah",
    publisher: "Kabar Sukamaju (contoh)",
    authors: "Redaksi",
    publishedAt: "10 Juli 2026",
    accessedAt: "5 Agustus 2026",
    sourceType: "Berita daring",
    url: "https://contoh.invalid/berita-dukungan",
    version: "v1",
    credibility: "perlu-telaah",
    verified: false,
    excerpt: [
      "Jajak pendapat daring menunjukkan mayoritas responden mendukung rancangan peraturan daerah.",
      "Artikel tidak menjelaskan jumlah responden maupun metode pengambilan sampel.",
    ],
  },
];

export function findMockSource(sourceId: string): SourceItem | undefined {
  return MOCK_SOURCES.find((source) => source.id === sourceId);
}

/** Kriteria verifikasi sumber (LOCK-PED-007). */
export const VERIFICATION_CRITERIA: VerificationCriterion[] = [
  {
    id: "kredibilitas",
    label: "Kredibilitas",
    question: "Siapa penulis atau lembaganya, dan apa dasar kewenangannya?",
  },
  {
    id: "relevansi",
    label: "Relevansi",
    question: "Apakah isi sumber menjawab pertanyaan kasus yang sedang dikaji?",
  },
  {
    id: "kecukupan",
    label: "Kecukupan",
    question: "Apakah bukti yang disajikan memadai untuk menopang klaim?",
  },
  {
    id: "keterlacakan",
    label: "Keterlacakan",
    question: "Dapatkah data atau kutipan ditelusuri ke sumber aslinya?",
  },
  {
    id: "konsistensi",
    label: "Konsistensi",
    question: "Apakah isinya konsisten dengan sumber lain yang kredibel?",
  },
  {
    id: "bias",
    label: "Potensi bias",
    question:
      "Adakah kepentingan atau sudut pandang yang memengaruhi penyajian?",
  },
];
