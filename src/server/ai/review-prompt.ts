/** @format */

import "server-only";

import type { EvidencePacket } from "@/lib/ai/evidence-packet";

export const REVIEW_PROMPT_VERSION = 1;

/** Batas kutipan per artefak supaya permintaan tetap muat dan terjangkau. */
const MAX_ARTIFACT_CHARS = 4000;

export const REVIEW_SYSTEM_INSTRUCTION = `
Anda membantu dosen menilai satu pekerjaan mahasiswa. Anda bukan penilai akhir
dan tidak pernah memutuskan kelulusan, ketuntasan, maupun jalur belajar.

ATURAN YANG TIDAK BOLEH DILANGGAR:
1. Nilai hanya berdasarkan bukti yang diberikan. Jangan menduga pekerjaan yang
   tidak ada.
2. Rubrik adalah satu-satunya dasar penilaian. Jangan menambahkan kriteria di
   luar rubrik, dan jangan menilai gaya menulis kecuali rubrik memintanya.
3. Skor hanya boleh dipilih dari daftar skor yang disediakan tiap kriteria.
   Bila kriteria tidak punya daftar skor, kembalikan suggestedScore null.
4. Bila bukti tidak cukup, tandai insufficientEvidence true, kembalikan
   suggestedScore null, dan katakan terus terang bahwa buktinya belum cukup.
5. Setiap alasan penilaian WAJIB menunjuk artifactId yang ada di paket bukti.
   Jangan pernah mengarang id, kutipan, revisi, atau verifikasi sumber.
6. Bagian "BANTUAN AI" adalah tuntunan yang diterima mahasiswa, BUKAN karya
   mahasiswa. Jangan memberi mahasiswa kredit atas gagasan yang berasal dari
   sana. Yang dapat dinilai hanyalah apa yang mahasiswa tulis sendiri.
7. Jangan memberi nilai lebih tinggi hanya karena jawabannya panjang.
8. Tulis seluruh keluaran dalam bahasa Indonesia.
9. Anda memberi usulan. Dosen yang memutuskan.
`.trim();

function renderArtifact(artifact: EvidencePacket["artifacts"][number]): string {
  const body = artifact.content.slice(0, MAX_ARTIFACT_CHARS);
  return [
    `artifactId: ${artifact.id}`,
    `jenis: ${artifact.kind}`,
    `judul: ${artifact.label}`,
    "isi:",
    body,
  ].join("\n");
}

export function buildReviewPrompt(packet: EvidencePacket): string {
  const student = packet.artifacts.filter((item) => item.studentAuthored);
  const scaffolding = packet.artifacts.filter((item) => !item.studentAuthored);

  const criteria = packet.criteria.map((criterion) => {
    const levels =
      criterion.levels.length > 0
        ? criterion.levels
            .map(
              (level) =>
                `    - skor ${level.score} (${level.label}): ${level.descriptor}`,
            )
            .join("\n")
        : "    - (rubrik belum memuat deskriptor; suggestedScore harus null)";

    return [
      `criterionId: ${criterion.id}`,
      `kode: ${criterion.code}`,
      `dimensi: ${criterion.dimension}`,
      `bobot: ${criterion.weight}`,
      `deskripsi: ${criterion.description}`,
      "skor yang sah:",
      levels,
    ].join("\n");
  });

  return [
    `Aktivitas: ${packet.activityTitle}`,
    `Unit: ${packet.unitTitle} · Tahap: ${packet.stageTitle}`,
    `Perintah aktivitas: ${packet.activityPrompt}`,
    "",
    `=== RUBRIK: ${packet.rubricTitle} ===`,
    criteria.join("\n\n"),
    "",
    "=== KARYA MAHASISWA ===",
    student.length > 0
      ? student.map(renderArtifact).join("\n\n---\n\n")
      : "(tidak ada)",
    "",
    "=== BANTUAN AI YANG DITERIMA MAHASISWA ===",
    "Bagian ini konteks proses, bukan karya mahasiswa. Jangan dinilai sebagai",
    "capaian mahasiswa.",
    scaffolding.length > 0
      ? scaffolding.map(renderArtifact).join("\n\n---\n\n")
      : "(tidak ada)",
  ].join("\n");
}
