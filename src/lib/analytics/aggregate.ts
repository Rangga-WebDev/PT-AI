/** @format */

import { DIMENSION_LABEL, type CtDimension } from "@/lib/constants/stages";

export interface DimensionMeasurement {
  dimension: CtDimension;
  score: number;
  measuredAt: string;
  measurementSource: "rubric" | "pretest" | "posttest";
}

export interface DimensionProgressRow {
  dimension: CtDimension;
  label: string;
  score: number;
  previousScore: number | null;
  target: number;
  measurementCount: number;
  measuredAt: string;
}

export const DEFAULT_MASTERY_TARGET = 75;

const DIMENSION_ORDER: CtDimension[] = [
  "interpretation",
  "analysis",
  "evaluation",
  "inference",
  "explanation",
  "self_regulation",
];

/**
 * Hanya dimensi yang benar-benar pernah diukur yang dikembalikan. Dimensi tanpa
 * pengukuran sengaja tidak diisi 0, karena "belum diukur" bukan "nilai nol".
 */
export function summarizeDimensions(
  measurements: DimensionMeasurement[],
  target = DEFAULT_MASTERY_TARGET,
): DimensionProgressRow[] {
  const byDimension = new Map<CtDimension, DimensionMeasurement[]>();

  for (const measurement of measurements) {
    const bucket = byDimension.get(measurement.dimension) ?? [];
    bucket.push(measurement);
    byDimension.set(measurement.dimension, bucket);
  }

  const rows: DimensionProgressRow[] = [];

  for (const dimension of DIMENSION_ORDER) {
    const bucket = byDimension.get(dimension);
    if (!bucket || bucket.length === 0) continue;

    const sorted = [...bucket].sort(
      (a, b) => Date.parse(a.measuredAt) - Date.parse(b.measuredAt),
    );
    const latest = sorted[sorted.length - 1]!;
    const previous = sorted.length > 1 ? sorted[sorted.length - 2]! : null;

    rows.push({
      dimension,
      label: DIMENSION_LABEL[dimension] ?? dimension,
      score: latest.score,
      previousScore: previous?.score ?? null,
      target,
      measurementCount: sorted.length,
      measuredAt: latest.measuredAt,
    });
  }

  return rows;
}

export interface DistributionSlice {
  key: string;
  label: string;
  count: number;
  tone: "success" | "evidence" | "info" | "danger";
}

/**
 * Distribusi ketuntasan satu kelas. "Belum dinilai" dihitung dari selisih
 * jumlah mahasiswa terdaftar, sehingga mahasiswa yang belum tersentuh
 * penilaian tidak hilang dari gambaran kelas.
 */
export function summarizeMasteryDistribution(input: {
  enrolledCount: number;
  outcomes: ("met" | "partially_met" | "not_met")[];
}): DistributionSlice[] {
  const met = input.outcomes.filter((item) => item === "met").length;
  const partial = input.outcomes.filter(
    (item) => item === "partially_met",
  ).length;
  const notMet = input.outcomes.filter((item) => item === "not_met").length;
  const assessed = met + partial + notMet;

  return [
    { key: "met", label: "Memenuhi", count: met, tone: "success" },
    {
      key: "partially_met",
      label: "Sebagian memenuhi",
      count: partial,
      tone: "evidence",
    },
    { key: "not_met", label: "Belum memenuhi", count: notMet, tone: "danger" },
    {
      key: "unassessed",
      label: "Belum dinilai",
      count: Math.max(0, input.enrolledCount - assessed),
      tone: "info",
    },
  ];
}

export interface ObservationInput {
  studentId: string;
  studentName: string;
  hasBaseline: boolean;
  pendingAiFeedbackCount: number;
  reflectionCount: number;
  revisionCount: number;
  dimensions: DimensionProgressRow[];
}

export interface Observation {
  studentId: string;
  studentName: string;
  key: string;
  description: string;
}

/**
 * Pengamatan bersifat deskriptif: menyebut fakta terhitung, bukan melabeli
 * mahasiswa. Kemampuan diukur pada satu waktu, sehingga label yang melekat
 * pada orang tidak pernah dikeluarkan sistem.
 */
export function deriveObservations(rows: ObservationInput[]): Observation[] {
  const observations: Observation[] = [];

  for (const row of rows) {
    const base = { studentId: row.studentId, studentName: row.studentName };

    if (!row.hasBaseline) {
      observations.push({
        ...base,
        key: "no_baseline",
        description: "Belum mengirim respons awal pada aktivitas ini.",
      });
    }

    if (row.pendingAiFeedbackCount > 0) {
      observations.push({
        ...base,
        key: "ai_unanswered",
        description: `${row.pendingAiFeedbackCount} saran AI belum ditanggapi.`,
      });
    }

    if (row.hasBaseline && row.revisionCount === 0) {
      observations.push({
        ...base,
        key: "no_revision",
        description: "Respons awal belum pernah direvisi.",
      });
    }

    if (row.hasBaseline && row.reflectionCount === 0) {
      observations.push({
        ...base,
        key: "no_reflection",
        description: "Refleksi belum diisi.",
      });
    }

    for (const dimension of row.dimensions) {
      if (
        dimension.previousScore !== null &&
        dimension.score < dimension.previousScore
      ) {
        observations.push({
          ...base,
          key: `score_down_${dimension.dimension}`,
          description: `Skor ${dimension.label} turun dari ${dimension.previousScore} ke ${dimension.score} antar-pengukuran.`,
        });
      }
    }
  }

  return observations;
}

export type FidelityGroup = "Persiapan" | "Sintaks" | "Tata kelola";

export interface FidelityItem {
  key: string;
  label: string;
  group: FidelityGroup;
}

export const FIDELITY_GROUPS: FidelityGroup[] = [
  "Persiapan",
  "Sintaks",
  "Tata kelola",
];

/** Checklist keterlaksanaan model; sepuluh komponen mengikuti Lampiran 4 proposal. */
export const FIDELITY_CHECKLIST: FidelityItem[] = [
  {
    key: "source_pack",
    label: "Source pack terkurasi tersedia dan aturan penggunaan AI dijelaskan",
    group: "Persiapan",
  },
  {
    key: "attempt_first",
    label: "Respons awal ditulis sebelum bantuan AI",
    group: "Sintaks",
  },
  {
    key: "claim_analysis",
    label: "Klaim, alasan, asumsi, dan bias diidentifikasi mahasiswa",
    group: "Sintaks",
  },
  {
    key: "verification",
    label: "Verifikasi sumber dijalankan dan keluaran AI dibandingkan",
    group: "Sintaks",
  },
  {
    key: "alternatives_tested",
    label: "Kontraargumen, alternatif, dan batas kesimpulan diuji",
    group: "Sintaks",
  },
  {
    key: "revision",
    label: "Justifikasi berbasis bukti direvisi setelah umpan balik",
    group: "Sintaks",
  },
  {
    key: "reflection",
    label: "Refleksi terstruktur diisi termasuk pengungkapan penggunaan AI",
    group: "Sintaks",
  },
  {
    key: "lecturer_decision",
    label: "Dosen memoderasi umpan balik AI dan memutuskan ketuntasan",
    group: "Tata kelola",
  },
  {
    key: "adaptive_branching",
    label: "Remedial atau pengayaan diberikan atas kriteria yang dijelaskan",
    group: "Tata kelola",
  },
  {
    key: "dose_ethics_incident",
    label:
      "Target unit tercapai, deviasi dicatat, keluaran bermasalah dilaporkan",
    group: "Tata kelola",
  },
];

export function fidelityRate(
  records: { checklistKey: string; isImplemented: boolean }[],
): number {
  const latest = new Map<string, boolean>();
  for (const record of records) {
    latest.set(record.checklistKey, record.isImplemented);
  }

  const implemented = FIDELITY_CHECKLIST.filter(
    (item) => latest.get(item.key) === true,
  ).length;

  return Math.round((implemented / FIDELITY_CHECKLIST.length) * 100);
}
