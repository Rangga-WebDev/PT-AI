/** @format */

import { describe, expect, it } from "vitest";

import { snapshotToWorkspace, type UnitSnapshot } from "@/lib/content/snapshot";

const LOCATION = {
  unitId: "unit-1",
  moduleTitle: "Modul Satu",
  classId: "class-1",
};

function snapshot(overrides: Partial<UnitSnapshot> = {}): UnitSnapshot {
  return {
    unit: {
      id: "unit-1",
      title: "Disinformasi Digital",
      objective: "Menilai kualitas bukti.",
      unit_kind: "core",
      opens_at: null,
      closes_at: null,
    },
    case: {
      id: "case-1",
      title: "Konsultasi Publik",
      context: "Konteks versi pertama.",
      body: "Isi kasus versi pertama.",
      key_question: "Apakah konsultasi itu bermakna?",
    },
    stages: [
      {
        id: "stage-2",
        stage_key: "analysis",
        sequence: 2,
        title: "Analisis",
        focus: "Membedah klaim.",
        is_enabled: true,
        activities: [],
      },
      {
        id: "stage-1",
        stage_key: "interpretation",
        sequence: 1,
        title: "Interpretasi",
        focus: "Merumuskan masalah.",
        is_enabled: true,
        activities: [
          {
            id: "act-2",
            title: "Aktivitas Draf",
            prompt: "Belum terbit.",
            activity_type: "written_response",
            sequence: 2,
            status: "draft",
            allows_ai: false,
            allowed_ai_functions: [],
            requires_attempt_before_ai: true,
            due_at: null,
            mastery_threshold: null,
            instructions: [],
          },
          {
            id: "act-1",
            title: "Respons Awal",
            prompt: "Tulis pendirian Anda.",
            activity_type: "written_response",
            response_schema: "cer",
            sequence: 1,
            status: "published",
            allows_ai: true,
            allowed_ai_functions: ["guiding_questions"],
            requires_attempt_before_ai: true,
            due_at: null,
            mastery_threshold: 75,
            instructions: [
              { audience: "lecturer", content: "Catatan dosen.", sequence: 1 },
              { audience: "student", content: "Langkah kedua.", sequence: 2 },
              { audience: "student", content: "Langkah pertama.", sequence: 1 },
            ],
          },
        ],
      },
    ],
    source_pack: [
      {
        source_id: "src-2",
        title: "Sumber Kedua",
        source_type: "article",
        url: null,
        is_required: false,
        sequence: 2,
      },
      {
        source_id: "src-1",
        title: "Sumber Pertama",
        source_type: "regulation",
        url: null,
        is_required: true,
        sequence: 1,
      },
    ],
    ...overrides,
  };
}

describe("snapshotToWorkspace", () => {
  it("membaca stimulus dari snapshot, bukan dari konten hidup", () => {
    const workspace = snapshotToWorkspace(snapshot(), LOCATION, "ver-1");

    expect(workspace?.caseDetail?.body).toBe("Isi kasus versi pertama.");
    expect(workspace?.unit.title).toBe("Disinformasi Digital");
    expect(workspace?.unitVersionId).toBe("ver-1");
  });

  it("mengambil penempatan struktural dari basis data hidup", () => {
    const workspace = snapshotToWorkspace(snapshot(), LOCATION, "ver-1");

    expect(workspace?.unit.moduleTitle).toBe("Modul Satu");
    expect(workspace?.unit.classId).toBe("class-1");
  });

  it("mengurutkan tahap dan aktivitas sesuai urutan tersimpan", () => {
    const workspace = snapshotToWorkspace(snapshot(), LOCATION, "ver-1");

    expect(workspace?.stages.map((stage) => stage.stageKey)).toEqual([
      "interpretation",
      "analysis",
    ]);
  });

  it("menyembunyikan aktivitas yang belum terbit", () => {
    const workspace = snapshotToWorkspace(snapshot(), LOCATION, "ver-1");
    const stage = workspace?.stages[0];

    expect(stage?.activities.map((activity) => activity.id)).toEqual(["act-1"]);
  });

  it("hanya menampilkan instruksi beraudiens mahasiswa dan mengurutkannya", () => {
    const workspace = snapshotToWorkspace(snapshot(), LOCATION, "ver-1");

    expect(workspace?.stages[0]?.activities[0]?.instructions).toEqual([
      "Langkah pertama.",
      "Langkah kedua.",
    ]);
  });

  it("mempertahankan konfigurasi AI aktivitas apa adanya", () => {
    const activity = snapshotToWorkspace(snapshot(), LOCATION, "ver-1")
      ?.stages[0]?.activities[0];

    expect(activity?.allowsAi).toBe(true);
    expect(activity?.requiresAttemptBeforeAi).toBe(true);
    expect(activity?.allowedAiFunctions).toEqual(["guiding_questions"]);
    expect(activity?.responseSchema).toBe("cer");
  });

  it("menganggap snapshot lama tanpa response_schema sebagai free_text", () => {
    const workspace = snapshotToWorkspace(snapshot(), LOCATION, "ver-1");
    const stage = workspace?.stages.find(
      (item) => item.stageKey === "analysis",
    );

    expect(stage?.activities).toEqual([]);
  });

  it("mengurutkan source pack sesuai urutan yang terarsip", () => {
    const workspace = snapshotToWorkspace(snapshot(), LOCATION, "ver-1");

    expect(workspace?.sourcePack.map((item) => item.source_id)).toEqual([
      "src-1",
      "src-2",
    ]);
  });

  it("mengembalikan null bila snapshot tidak memuat unit", () => {
    expect(
      snapshotToWorkspace(snapshot({ unit: null }), LOCATION, "ver-1"),
    ).toBeNull();
  });
});
