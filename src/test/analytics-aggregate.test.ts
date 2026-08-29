/** @format */

import { describe, expect, it } from "vitest";

import {
  DEFAULT_MASTERY_TARGET,
  FIDELITY_CHECKLIST,
  FIDELITY_GROUPS,
  deriveObservations,
  fidelityRate,
  summarizeDimensions,
  summarizeMasteryDistribution,
  type DimensionMeasurement,
} from "@/lib/analytics/aggregate";

function measurement(
  dimension: DimensionMeasurement["dimension"],
  score: number,
  measuredAt: string,
): DimensionMeasurement {
  return { dimension, score, measuredAt, measurementSource: "rubric" };
}

describe("summarizeDimensions", () => {
  it("tidak mengarang nol untuk dimensi yang belum pernah diukur", () => {
    const rows = summarizeDimensions([
      measurement("analysis", 80, "2026-08-01T00:00:00.000Z"),
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.dimension).toBe("analysis");
  });

  it("mengembalikan daftar kosong ketika belum ada pengukuran sama sekali", () => {
    expect(summarizeDimensions([])).toEqual([]);
  });

  it("memakai pengukuran terbaru dan menyimpan pengukuran sebelumnya", () => {
    const rows = summarizeDimensions([
      measurement("evaluation", 60, "2026-08-01T00:00:00.000Z"),
      measurement("evaluation", 72, "2026-08-10T00:00:00.000Z"),
    ]);

    expect(rows[0]?.score).toBe(72);
    expect(rows[0]?.previousScore).toBe(60);
    expect(rows[0]?.measurementCount).toBe(2);
  });

  it("tidak bergantung pada urutan masukan", () => {
    const rows = summarizeDimensions([
      measurement("inference", 90, "2026-08-20T00:00:00.000Z"),
      measurement("inference", 50, "2026-08-02T00:00:00.000Z"),
    ]);

    expect(rows[0]?.score).toBe(90);
    expect(rows[0]?.previousScore).toBe(50);
  });

  it("mengurutkan dimensi sesuai urutan resmi, bukan urutan pengukuran", () => {
    const rows = summarizeDimensions([
      measurement("explanation", 70, "2026-08-01T00:00:00.000Z"),
      measurement("interpretation", 70, "2026-08-01T00:00:00.000Z"),
    ]);

    expect(rows.map((row) => row.dimension)).toEqual([
      "interpretation",
      "explanation",
    ]);
  });

  it("memakai target bawaan bila tidak ditentukan", () => {
    const rows = summarizeDimensions([
      measurement("analysis", 80, "2026-08-01T00:00:00.000Z"),
    ]);

    expect(rows[0]?.target).toBe(DEFAULT_MASTERY_TARGET);
  });
});

describe("summarizeMasteryDistribution", () => {
  it("menghitung mahasiswa yang belum dinilai dari jumlah terdaftar", () => {
    const slices = summarizeMasteryDistribution({
      enrolledCount: 10,
      outcomes: ["met", "met", "partially_met"],
    });

    expect(slices.find((s) => s.key === "unassessed")?.count).toBe(7);
    expect(slices.find((s) => s.key === "met")?.count).toBe(2);
  });

  it("tidak menghasilkan jumlah negatif ketika penilaian melebihi pendaftaran", () => {
    const slices = summarizeMasteryDistribution({
      enrolledCount: 1,
      outcomes: ["met", "met", "not_met"],
    });

    expect(slices.find((s) => s.key === "unassessed")?.count).toBe(0);
  });
});

describe("deriveObservations", () => {
  const base = {
    studentId: "s1",
    studentName: "Mahasiswa A",
    hasBaseline: true,
    pendingAiFeedbackCount: 0,
    reflectionCount: 1,
    revisionCount: 1,
    dimensions: [],
  };

  it("menyebut fakta terhitung tanpa melabeli mahasiswa", () => {
    const observations = deriveObservations([{ ...base, hasBaseline: false }]);

    expect(observations).toHaveLength(1);
    expect(observations[0]?.description).not.toMatch(/stagnan|lemah|malas/i);
  });

  it("tidak menghasilkan pengamatan ketika seluruh proses berjalan", () => {
    expect(deriveObservations([base])).toEqual([]);
  });

  it("melaporkan saran AI yang belum ditanggapi", () => {
    const observations = deriveObservations([
      { ...base, pendingAiFeedbackCount: 2 },
    ]);

    expect(observations[0]?.key).toBe("ai_unanswered");
    expect(observations[0]?.description).toContain("2");
  });

  it("melaporkan penurunan skor antar-pengukuran sebagai fakta", () => {
    const observations = deriveObservations([
      {
        ...base,
        dimensions: summarizeDimensions([
          measurement("analysis", 80, "2026-08-01T00:00:00.000Z"),
          measurement("analysis", 65, "2026-08-10T00:00:00.000Z"),
        ]),
      },
    ]);

    expect(observations[0]?.description).toContain("turun dari 80 ke 65");
  });

  it("tidak melaporkan revisi kosong sebelum respons awal ada", () => {
    const observations = deriveObservations([
      { ...base, hasBaseline: false, revisionCount: 0, reflectionCount: 0 },
    ]);

    expect(observations.map((item) => item.key)).toEqual(["no_baseline"]);
  });
});

describe("fidelityRate", () => {
  it("menghitung nol ketika belum ada observasi", () => {
    expect(fidelityRate([])).toBe(0);
  });

  it("memakai observasi terakhir untuk setiap butir", () => {
    const rate = fidelityRate([
      { checklistKey: "attempt_first", isImplemented: false },
      { checklistKey: "attempt_first", isImplemented: true },
    ]);

    expect(rate).toBe(Math.round((1 / FIDELITY_CHECKLIST.length) * 100));
  });

  it("mengabaikan butir di luar checklist resmi", () => {
    expect(
      fidelityRate([{ checklistKey: "butir_asing", isImplemented: true }]),
    ).toBe(0);
  });

  it("memuat sepuluh komponen Lampiran 4 dengan kunci unik", () => {
    const keys = FIDELITY_CHECKLIST.map((item) => item.key);

    expect(keys).toHaveLength(10);
    expect(new Set(keys).size).toBe(10);
  });

  it("menempatkan setiap butir pada kelompok yang dikenal", () => {
    for (const group of FIDELITY_GROUPS) {
      expect(FIDELITY_CHECKLIST.some((item) => item.group === group)).toBe(
        true,
      );
    }

    for (const item of FIDELITY_CHECKLIST) {
      expect(FIDELITY_GROUPS).toContain(item.group);
    }
  });
});
