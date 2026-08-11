/** @format */

// MOCK — data contoh untuk prototipe visual PHASE 3.

import type {
  DimensionProgress,
  IncidentItem,
  MasteryDistributionItem,
  ReviewQueueItem,
} from "@/types/learning";

export const MOCK_DIMENSION_PROGRESS: DimensionProgress[] = [
  { dimension: "interpretation", label: "Interpretasi", score: 82, target: 75 },
  { dimension: "analysis", label: "Analisis", score: 76, target: 75 },
  { dimension: "evaluation", label: "Evaluasi", score: 58, target: 75 },
  { dimension: "inference", label: "Inferensi", score: 41, target: 75 },
  { dimension: "explanation", label: "Eksplanasi", score: 35, target: 75 },
  {
    dimension: "self-regulation",
    label: "Regulasi diri",
    score: 62,
    target: 75,
  },
];

export const MOCK_REVIEW_QUEUE: ReviewQueueItem[] = [
  {
    id: "review-1",
    studentName: "Anindita Rahmawati",
    className: "PKN-2201-A",
    stageTitle: "Evaluasi bukti",
    submittedLabel: "2 jam lalu",
    status: "menunggu",
  },
  {
    id: "review-2",
    studentName: "Bimo Prasetyo",
    className: "PKN-2201-A",
    stageTitle: "Analisis klaim",
    submittedLabel: "5 jam lalu",
    status: "menunggu",
  },
  {
    id: "review-3",
    studentName: "Citra Halimah",
    className: "PKN-2201-B",
    stageTitle: "Refleksi",
    submittedLabel: "Kemarin",
    status: "diproses",
  },
];

export const MOCK_MASTERY_DISTRIBUTION: MasteryDistributionItem[] = [
  { label: "Tuntas", count: 14, tone: "success" },
  { label: "Perlu revisi", count: 11, tone: "evidence" },
  { label: "Belum attempt", count: 9, tone: "info" },
  { label: "Stagnan", count: 4, tone: "danger" },
];

export const MOCK_INCIDENTS: IncidentItem[] = [
  {
    id: "insiden-1",
    className: "PKN-2201-A",
    reason: "Mahasiswa melaporkan feedback AI dianggap mengarahkan jawaban.",
    reportedLabel: "1 hari lalu",
  },
  {
    id: "insiden-2",
    className: "PKN-2201-B",
    reason: "Kutipan AI tidak dapat ditelusuri ke sumber yang dilampirkan.",
    reportedLabel: "3 hari lalu",
  },
];
