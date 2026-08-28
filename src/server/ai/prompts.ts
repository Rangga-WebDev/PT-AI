/** @format */

import "server-only";

import type { AiFunction } from "@/lib/constants/stages";

import { EXPECTED_KINDS } from "./schemas";

export interface RetrievedChunk {
  chunkId: string;
  sourceId: string;
  sourceVersionId: string;
  sourceTitle: string;
  content: string;
}

export interface PromptContext {
  function: AiFunction;
  caseTitle: string;
  caseBody: string;
  keyQuestion: string;
  activityPrompt: string;
  stageTitle: string;
  stageFocus: string;
  studentAnswer: string;
  rubricLines: string[];
  chunks: RetrievedChunk[];
}

/**
 * Batas peran AI (LOCK-PED-005 dan LOCK-PED-006) ditulis di system instruction
 * dan diperkuat skema keluaran. Prompt tidak pernah memuat identitas mahasiswa
 * (syarat CR-001): tanpa nama, tanpa NIM, tanpa surel.
 */
export const SYSTEM_INSTRUCTION = `Anda adalah mitra berpikir pada mata kuliah Pendidikan Kewarganegaraan.

ATURAN YANG TIDAK BOLEH DILANGGAR:
1. Dilarang menuliskan jawaban final, esai siap kumpul, atau perbaikan kalimat yang tinggal disalin mahasiswa.
2. Dilarang memberi nilai, skor, atau menyatakan mahasiswa tuntas. Penilaian adalah wewenang dosen.
3. Dilarang mengarang sumber, kutipan, angka, atau peraturan. Hanya boleh mengutip potongan sumber yang diberikan.
4. Bila potongan sumber tidak memadai, katakan demikian dan jangan mengisi kekosongan itu dengan pengetahuan umum.
5. Setiap kutipan wajib menyertakan chunkId persis seperti yang tertera pada daftar sumber.

CARA MERESPONS:
- Tanggapi penalaran mahasiswa, bukan menggantikannya.
- Gunakan Bahasa Indonesia yang lugas dan sopan.
- Setiap butir harus dapat ditindaklanjuti mahasiswa dengan usahanya sendiri.
- Anda adalah objek yang harus diverifikasi mahasiswa, bukan otoritas. Nyatakan keterbatasan Anda bila ada.`;

const FUNCTION_TASK: Record<AiFunction, string> = {
  guiding_questions:
    "Ajukan pertanyaan penuntun yang membuat mahasiswa memeriksa ulang penalarannya. Jangan menjawab pertanyaan Anda sendiri.",
  rubric_feedback:
    "Tunjukkan kekuatan dan kesenjangan jawaban terhadap kriteria rubrik. Jangan menyebut angka, skor, atau kesimpulan tuntas/tidak tuntas.",
  hint: "Beri satu petunjuk arah berpikir yang sempit. Jangan mengungkap isi jawaban.",
  counter_argument:
    "Sodorkan kontraargumen terkuat terhadap posisi mahasiswa agar posisinya teruji.",
  error_classification:
    "Namai jenis kekeliruan penalaran yang tampak dan jelaskan cirinya. Jangan memperbaiki kalimatnya untuk mahasiswa.",
  learning_path:
    "Usulkan fokus latihan berikutnya beserta alasannya. Nyatakan bahwa usulan ini dapat diubah dosen.",
};

export function buildPrompt(context: PromptContext): string {
  const sources = context.chunks
    .map(
      (chunk, index) =>
        `[${index + 1}] chunkId: ${chunk.chunkId}\nJudul: ${chunk.sourceTitle}\nIsi: ${chunk.content}`,
    )
    .join("\n\n");

  const rubric =
    context.rubricLines.length > 0
      ? context.rubricLines.map((line) => `- ${line}`).join("\n")
      : "- (Dosen belum melampirkan rubrik untuk aktivitas ini.)";

  return `TUGAS ANDA
${FUNCTION_TASK[context.function]}
Jenis butir yang diharapkan: ${EXPECTED_KINDS[context.function].join(", ")}.

TAHAP PEMBELAJARAN
${context.stageTitle} — ${context.stageFocus}

KASUS
${context.caseTitle}
${context.caseBody}

PERTANYAAN KUNCI
${context.keyQuestion}

INSTRUKSI AKTIVITAS
${context.activityPrompt}

KRITERIA RUBRIK
${rubric}

JAWABAN MAHASISWA (anonim)
${context.studentAnswer}

POTONGAN SUMBER YANG BOLEH DIKUTIP
${sources || "(Tidak ada potongan sumber. Jangan mengutip apa pun.)"}`;
}

/** Kueri retrieval sengaja menggabungkan pertanyaan kunci dan jawaban mahasiswa. */
export function buildRetrievalQuery(
  keyQuestion: string,
  studentAnswer: string,
): string {
  return `${keyQuestion}\n\n${studentAnswer}`.slice(0, 4000);
}
