/** @format */

import "server-only";

import { normalizeVector } from "@/lib/ai/vector";

import type { AiProvider } from "./types";

/** Bentuk keluaran Quick Setup; sengaja memuat satu ambiguitas agar UI-nya teruji. */
function quickSetupSample() {
  return {
    course: { title: "Pendidikan Kewarganegaraan" },
    learningOutcomes: [
      {
        code: "CPMK1",
        title: "Menganalisis kedudukan warga negara dalam konstitusi",
        type: "CPMK",
      },
      {
        code: "CPMK2",
        title: "Mengevaluasi argumen tentang kebijakan publik",
        type: "CPMK",
      },
    ],
    meetings: [
      {
        sequence: 1,
        title: "Kedudukan warga negara",
        topic: "Hak dan kewajiban konstitusional",
        objectives: ["Menjelaskan dasar konstitusional kewarganegaraan"],
        suggestedMaterials: ["UUD 1945 Pasal 26-28"],
        suggestedActivities: ["Diskusi kasus status kewarganegaraan"],
        assessmentSuggestions: ["Esai argumentatif singkat"],
        criticalThinkingDimensions: ["interpretation", "analysis"],
        ptaiCandidate: false,
      },
      {
        sequence: 2,
        title: "Demokrasi dan ruang publik digital",
        topic: "Partisipasi warga di kanal digital",
        objectives: ["Membandingkan bentuk partisipasi luring dan daring"],
        suggestedMaterials: [],
        suggestedActivities: ["Analisis klaim pada satu kasus kebijakan"],
        assessmentSuggestions: ["Penilaian rubrik argumen"],
        criticalThinkingDimensions: ["evaluation", "inference"],
        ptaiCandidate: true,
        ptaiRationale:
          "Topik memuat isu publik yang menuntut penimbangan bukti dan argumentasi.",
      },
    ],
    references: [{ title: "Kaelan, Pendidikan Kewarganegaraan" }],
    warnings: [],
    ambiguities: ["Jumlah pertemuan tidak dinyatakan eksplisit di dokumen."],
  };
}

/**
 * Provider deterministik untuk pengujian ujung-ke-ujung. Dipakai hanya ketika
 * AI_PROVIDER_MODE=fake agar E2E tidak memanggil penyedia sungguhan, tidak
 * menghabiskan kuota, dan hasilnya dapat diprediksi.
 *
 * Kebenaran integrasi dengan Gemini diuji terpisah lewat `npm run ai:check`.
 */
export const fakeProvider: AiProvider = {
  async generateStructured({ prompt }) {
    if (prompt.includes("=== ISI DOKUMEN ===")) {
      return {
        text: JSON.stringify(quickSetupSample()),
        inputTokens: 200,
        outputTokens: 120,
        latencyMs: 1,
      };
    }

    // chunkId pertama pada prompt dipakai agar keterlacakan kutipan ikut teruji.
    const match = /chunkId: ([0-9a-f-]{36})/.exec(prompt);
    const chunkId = match?.[1] ?? "";

    const items = [
      {
        kind: "guiding_question",
        title: "Bukti apa yang menopang klaim Anda?",
        body: "Tunjukkan bagian sumber yang Anda pakai, lalu nyatakan keterbatasannya.",
        citations: chunkId
          ? [{ chunkId, quotedText: "Kutipan uji dari potongan sumber." }]
          : [],
      },
      {
        kind: "gap",
        title: "Kutipan tanpa asal yang jelas",
        body: "Butir ini sengaja mengutip sumber di luar daftar agar keterlacakan diuji.",
        citations: [
          {
            chunkId: "00000000-0000-4000-8000-000000000000",
            quotedText: "Kutipan yang tidak ada dalam source pack.",
          },
        ],
      },
    ];

    return {
      text: JSON.stringify({ items }),
      inputTokens: 100,
      outputTokens: 50,
      latencyMs: 1,
    };
  },

  async embed(texts) {
    // Vektor tetap dan ternormalisasi; nilai persisnya tidak penting karena
    // retrieval hanya perlu mengembalikan potongan yang ada.
    return texts.map(() =>
      normalizeVector(
        Array.from({ length: 1536 }, (_, index) => Math.sin(index + 1)),
      ),
    );
  },
};
