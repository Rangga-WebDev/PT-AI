/** @format */

// MOCK — data contoh untuk prototipe visual PHASE 3.

import type { CaseDetail, ClaimItem } from "@/types/learning";

export const MOCK_CASE: CaseDetail = {
  id: "kasus-rtrh",
  title: "Konsultasi Publik Rancangan Peraturan Daerah Ruang Terbuka Hijau",
  context: "Isu kewarganegaraan — partisipasi warga dalam kebijakan publik",
  paragraphs: [
    "Pemerintah Kota Sukamaju membuka konsultasi publik atas rancangan peraturan daerah yang mengatur alih fungsi ruang terbuka hijau menjadi kawasan komersial. Konsultasi diumumkan melalui laman resmi pemerintah kota selama tujuh hari kerja, dengan satu sesi pertemuan tatap muka di balai kota pada hari kerja pukul 10.00.",
    "Forum warga RW 07 menyatakan bahwa jadwal tersebut menyulitkan warga yang bekerja, sehingga hanya 24 orang hadir dari sekitar 12.000 warga terdampak. Sebaliknya, juru bicara pemerintah kota menyatakan bahwa proses telah memenuhi ketentuan formal karena pengumuman dilakukan sesuai tenggat dan seluruh masukan tertulis diterima melalui surel.",
    "Sebuah organisasi masyarakat sipil merilis catatan bahwa dari 31 masukan tertulis yang masuk, 19 di antaranya tidak memperoleh tanggapan tertulis. Di sisi lain, sebuah media daring lokal memberitakan bahwa mayoritas warga mendukung rancangan tersebut dengan mengutip jajak pendapat daring tanpa menjelaskan metode pengambilan sampel.",
    "Sejumlah unggahan media sosial kemudian menyebarkan klaim bahwa penolakan warga digerakkan oleh kepentingan politik menjelang pemilihan kepala daerah. Klaim ini beredar luas tanpa disertai bukti yang dapat ditelusuri.",
  ],
  keyQuestion:
    "Sejauh mana proses konsultasi publik tersebut memenuhi prinsip partisipasi warga yang bermakna, dan bukti apa yang Anda perlukan untuk menilainya?",
  sourceIds: ["sumber-perwali", "sumber-catatan-osm", "sumber-berita-daring"],
};

export const MOCK_CLAIMS: ClaimItem[] = [
  {
    id: "klaim-1",
    text: "Proses konsultasi publik telah memenuhi ketentuan formal.",
    linkedSourceIds: ["sumber-perwali"],
  },
  {
    id: "klaim-2",
    text: "Mayoritas warga mendukung rancangan peraturan daerah tersebut.",
    linkedSourceIds: [],
  },
  {
    id: "klaim-3",
    text: "Sebagian besar masukan tertulis warga tidak memperoleh tanggapan.",
    linkedSourceIds: ["sumber-catatan-osm"],
  },
];
