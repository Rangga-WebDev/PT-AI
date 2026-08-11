/** @format */

// MOCK — data contoh untuk prototipe visual PHASE 3.
// Teks di bawah adalah contoh statis, BUKAN keluaran model AI.
// Integrasi AI nyata baru dibangun pada PHASE 10.

import type { AIFeedbackItem } from "@/types/learning";

export const MOCK_AI_FEEDBACK: AIFeedbackItem[] = [
  {
    id: "ai-1",
    kind: "strength",
    title: "Kekuatan respons Anda",
    body: "Anda sudah membedakan antara pemenuhan prosedur formal dan kualitas partisipasi. Pembedaan ini penting untuk menilai kasus.",
  },
  {
    id: "ai-2",
    kind: "gap",
    title: "Kesenjangan yang perlu ditutup",
    body: "Klaim tentang dukungan mayoritas warga belum ditautkan ke bukti. Sumber berita yang dikutip tidak menjelaskan metode jajak pendapatnya.",
  },
  {
    id: "ai-3",
    kind: "guiding-question",
    title: "Pertanyaan penuntun",
    body: "Bukti apa yang Anda perlukan untuk menyimpulkan bahwa 24 peserta cukup mewakili 12.000 warga terdampak?",
  },
  {
    id: "ai-4",
    kind: "counter-argument",
    title: "Kontraargumen untuk diuji",
    body: "Seseorang dapat berargumen bahwa rendahnya kehadiran menunjukkan ketidakpedulian warga, bukan kegagalan penyelenggara. Bagaimana Anda menanggapinya dengan bukti?",
  },
];
