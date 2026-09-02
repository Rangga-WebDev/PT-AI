/** @format */

// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthorizationError } from "@/lib/errors";
import { buildApplyPlan } from "@/lib/ai/apply-plan";

const requireLecturerOfClass = vi.fn();
const draftRow = vi.fn();
const moduleRows = vi.fn();
const insert = vi.fn();
const auditInsert = vi.fn();
const touched: string[] = [];

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/auth", () => ({
  requireLecturerOfClass: (classId: string) => requireLecturerOfClass(classId),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      touched.push(`admin:${table}`);
      return { insert: (row: unknown) => auditInsert(row) };
    },
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: (table: string) => {
      touched.push(table);
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () => draftRow(),
            is: () => ({ order: () => moduleRows() }),
          }),
        }),
        insert: (rows: unknown) => insert(rows),
      };
    },
  }),
}));

const { applyQuickSetupDraft, previewQuickSetupApply } =
  await import("@/server/services/quick-setup-apply");

const CLASS_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_CLASS = "99999999-9999-4999-8999-999999999999";
const DRAFT_ID = "22222222-2222-4222-8222-222222222222";

function meeting(sequence: number, title: string, extra = {}) {
  return {
    sequence,
    title,
    objectives: [`Tujuan pertemuan ${sequence}`],
    suggestedMaterials: [],
    suggestedActivities: ["Diskusi kasus"],
    assessmentSuggestions: [],
    criticalThinkingDimensions: [],
    ptaiCandidate: false,
    ...extra,
  };
}

const DRAFT = {
  learningOutcomes: [{ title: "Menganalisis kedudukan warga negara" }],
  meetings: [
    meeting(1, "Kedudukan warga negara"),
    meeting(2, "Demokrasi digital", {
      ptaiCandidate: true,
      ptaiRationale: "Isu publik yang menuntut penimbangan bukti.",
      topic: "Partisipasi warga",
    }),
    meeting(3, "Hak asasi manusia"),
  ],
  references: [{ title: "Kaelan, Pendidikan Kewarganegaraan" }],
  warnings: [],
  ambiguities: [],
};

function draft(overrides: Record<string, unknown> = {}) {
  return {
    data: {
      id: DRAFT_ID,
      class_id: CLASS_ID,
      status: "approved",
      output: JSON.stringify(DRAFT),
      ...overrides,
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  touched.length = 0;
  requireLecturerOfClass.mockResolvedValue({ id: "lecturer" });
  draftRow.mockResolvedValue(draft());
  moduleRows.mockResolvedValue({ data: [] });
  insert.mockResolvedValue({ error: null });
  auditInsert.mockResolvedValue({ error: null });
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("perencanaan penerapan", () => {
  it("mempertahankan yang sudah ada, bukan menimpanya", () => {
    const plan = buildApplyPlan(DRAFT, [
      { sequence: 2, title: "Demokrasi Indonesia" },
    ]);

    expect(plan.create.map((item) => item.sequence)).toEqual([1, 3]);
    expect(plan.skip).toEqual([
      {
        sequence: 2,
        draftTitle: "Demokrasi digital",
        existingTitle: "Demokrasi Indonesia",
      },
    ]);
  });

  it("menyusun deskripsi dari topik dan tujuan dokumen", () => {
    const plan = buildApplyPlan(DRAFT, []);
    const second = plan.create.find((item) => item.sequence === 2);

    expect(second?.description).toContain("Partisipasi warga");
    expect(second?.description).toContain("Tujuan pertemuan 2");
  });

  // Saran AI tidak boleh masuk ke struktur kelas sebagai fakta dokumen.
  it("tidak memasukkan saran AI ke deskripsi modul", () => {
    const plan = buildApplyPlan(DRAFT, []);

    for (const item of plan.create) {
      expect(item.description ?? "").not.toContain("Diskusi kasus");
    }
  });

  it("melaporkan bagian yang belum punya tempat di skema", () => {
    const plan = buildApplyPlan(DRAFT, []);
    const sections = plan.unsupported.map((item) => item.section);

    expect(sections).toContain("CPMK / Sub-CPMK");
    expect(sections).toContain("Referensi");
  });

  it("menandai kandidat PT-AI tanpa mengubah rencana pembuatan", () => {
    const plan = buildApplyPlan(DRAFT, []);

    expect(plan.ptaiCandidates).toEqual([
      {
        sequence: 2,
        title: "Demokrasi digital",
        rationale: "Isu publik yang menuntut penimbangan bukti.",
      },
    ]);
    expect(plan.create).toHaveLength(3);
  });

  it("tidak menghasilkan dua modul untuk nomor pertemuan yang sama", () => {
    const plan = buildApplyPlan(
      { ...DRAFT, meetings: [meeting(1, "Satu"), meeting(1, "Satu lagi")] },
      [],
    );

    expect(plan.create).toHaveLength(1);
    expect(plan.skip).toHaveLength(1);
  });
});

describe("gerbang penerapan", () => {
  it("menolak draf yang belum disetujui", async () => {
    draftRow.mockResolvedValue(draft({ status: "draft" }));

    const result = await applyQuickSetupDraft(DRAFT_ID, CLASS_ID);

    expect(result).toEqual({ ok: false, reason: "not_approved" });
    expect(insert).not.toHaveBeenCalled();
  });

  it("menolak draf yang sudah dibuang", async () => {
    draftRow.mockResolvedValue(draft({ status: "discarded" }));

    const result = await applyQuickSetupDraft(DRAFT_ID, CLASS_ID);

    expect(result).toEqual({ ok: false, reason: "not_approved" });
  });

  // Kelas datang dari permintaan; kecocokannya diperiksa terhadap baris draf.
  it("menolak ketika kelas tidak cocok dengan draf", async () => {
    const result = await applyQuickSetupDraft(DRAFT_ID, OTHER_CLASS);

    expect(result).toEqual({ ok: false, reason: "class_mismatch" });
    expect(requireLecturerOfClass).not.toHaveBeenCalled();
  });

  it("menolak dosen di luar kelas", async () => {
    requireLecturerOfClass.mockRejectedValue(new AuthorizationError());

    const result = await applyQuickSetupDraft(DRAFT_ID, CLASS_ID);

    expect(result).toEqual({ ok: false, reason: "forbidden" });
    expect(insert).not.toHaveBeenCalled();
  });

  it("menolak draf yang tidak terlihat lewat sesi pengguna", async () => {
    draftRow.mockResolvedValue({ data: null });

    const result = await applyQuickSetupDraft(DRAFT_ID, CLASS_ID);

    expect(result).toEqual({ ok: false, reason: "draft_not_found" });
  });
});

describe("pratinjau", () => {
  it("mengenali pertemuan yang sudah ada di kelas", async () => {
    moduleRows.mockResolvedValue({
      data: [
        { sequence: 1, title: "Pengantar" },
        { sequence: 3, title: "HAM" },
      ],
    });

    const result = await previewQuickSetupApply(DRAFT_ID, CLASS_ID);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.plan.create.map((item) => item.sequence)).toEqual([2]);
    expect(result.plan.skip.map((item) => item.sequence)).toEqual([1, 3]);
  });

  // Pratinjau tidak boleh menulis apa pun.
  it("tidak menyentuh basis data untuk menulis", async () => {
    await previewQuickSetupApply(DRAFT_ID, CLASS_ID);

    expect(insert).not.toHaveBeenCalled();
    expect(auditInsert).not.toHaveBeenCalled();
  });
});

describe("penerapan", () => {
  it("membuat pertemuan yang belum ada sebagai satu perintah", async () => {
    const result = await applyQuickSetupDraft(DRAFT_ID, CLASS_ID);

    expect(result).toEqual({ ok: true, created: 3, skipped: 0 });
    expect(insert).toHaveBeenCalledTimes(1);

    const rows = insert.mock.calls[0]![0] as Record<string, unknown>[];
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({
      class_id: CLASS_ID,
      sequence: 1,
      title: "Kedudukan warga negara",
      created_by: "lecturer",
    });
  });

  it("melewati yang sudah ada dan melaporkan jumlahnya", async () => {
    moduleRows.mockResolvedValue({
      data: [{ sequence: 2, title: "Demokrasi Indonesia" }],
    });

    const result = await applyQuickSetupDraft(DRAFT_ID, CLASS_ID);

    expect(result).toEqual({ ok: true, created: 2, skipped: 1 });
    const rows = insert.mock.calls[0]![0] as Record<string, unknown>[];
    expect(rows.map((row) => row["sequence"])).toEqual([1, 3]);
  });

  // Penekanan tombol kedua tidak boleh menggandakan apa pun.
  it("tidak menggandakan pada penerapan kedua", async () => {
    await applyQuickSetupDraft(DRAFT_ID, CLASS_ID);

    moduleRows.mockResolvedValue({
      data: [
        { sequence: 1, title: "Kedudukan warga negara" },
        { sequence: 2, title: "Demokrasi digital" },
        { sequence: 3, title: "Hak asasi manusia" },
      ],
    });

    const second = await applyQuickSetupDraft(DRAFT_ID, CLASS_ID);

    expect(second).toEqual({ ok: false, reason: "nothing_to_apply" });
    expect(insert).toHaveBeenCalledTimes(1);
  });

  it("tidak menerbitkan apa pun", async () => {
    await applyQuickSetupDraft(DRAFT_ID, CLASS_ID);

    const rows = insert.mock.calls[0]![0] as Record<string, unknown>[];
    for (const row of rows) {
      expect(row["status"]).toBeUndefined();
    }
  });

  // Kandidat PT-AI tetap usulan; unit, kasus, dan aktivitas tidak dibuat.
  it("hanya menyentuh tabel modules", async () => {
    await applyQuickSetupDraft(DRAFT_ID, CLASS_ID);

    expect(touched.filter((item) => !item.startsWith("admin:"))).toEqual([
      "ai_material_drafts",
      "modules",
      "modules",
    ]);
    expect(touched).not.toContain("learning_units");
    expect(touched).not.toContain("activities");
    expect(touched).not.toContain("cases");
  });

  it("mencatat jejak penerapan ke audit_logs", async () => {
    await applyQuickSetupDraft(DRAFT_ID, CLASS_ID);

    expect(auditInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "quick_setup_apply",
        subject_table: "modules",
        subject_id: DRAFT_ID,
      }),
    );
  });
});

describe("kegagalan penulisan", () => {
  it("tidak mengaku berhasil ketika basis data menolak", async () => {
    insert.mockResolvedValue({
      error: { code: "23503", message: "foreign key violation" },
    });

    const result = await applyQuickSetupDraft(DRAFT_ID, CLASS_ID);

    expect(result).toEqual({ ok: false, reason: "database_error" });
    expect(auditInsert).not.toHaveBeenCalled();
  });

  it("mengenali nomor pertemuan yang direbut di sela permintaan", async () => {
    insert.mockResolvedValue({
      error: { code: "23505", message: "uq_modules_sequence" },
    });

    const result = await applyQuickSetupDraft(DRAFT_ID, CLASS_ID);

    expect(result).toEqual({ ok: false, reason: "sequence_taken" });
  });

  it("tidak membocorkan SQLSTATE maupun nama constraint", async () => {
    const { APPLY_MESSAGE } =
      await import("@/server/services/quick-setup-apply");

    for (const message of Object.values(APPLY_MESSAGE)) {
      expect(message).not.toMatch(/\d{5}/);
      expect(message).not.toContain("uq_");
      expect(message).not.toContain("constraint");
    }
  });

  it("tetap berhasil meski pencatatan audit gagal", async () => {
    auditInsert.mockRejectedValue(new Error("audit down"));

    const result = await applyQuickSetupDraft(DRAFT_ID, CLASS_ID);

    expect(result).toEqual({ ok: true, created: 3, skipped: 0 });
  });
});
