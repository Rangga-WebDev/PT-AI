/** @format */

// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthorizationError } from "@/lib/errors";

const requireLecturerOfClass = vi.fn();
const generateQuickSetupDraft = vi.fn();
const insert = vi.fn();
const update = vi.fn();
const touchedTables: string[] = [];

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/supabase/auth", () => ({
  requireLecturerOfClass: (classId: string) => requireLecturerOfClass(classId),
}));

vi.mock("@/server/ai/quick-setup", async () => {
  const actual = await vi.importActual<
    typeof import("@/server/ai/quick-setup")
  >("@/server/ai/quick-setup");
  return {
    ...actual,
    generateQuickSetupDraft: (input: unknown) => generateQuickSetupDraft(input),
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: (table: string) => {
      touchedTables.push(table);
      return {
        insert: (row: Record<string, unknown>) => insert(row),
        update: (patch: Record<string, unknown>) => {
          update(patch);
          return {
            eq: () => ({ eq: () => ({ error: null }) }),
          };
        },
      };
    },
  }),
}));

const {
  approveQuickSetupDraftAction,
  discardQuickSetupDraftAction,
  generateQuickSetupDraftAction,
} = await import("@/actions/courses/quick-setup");

const CLASS_ID = "11111111-1111-4111-8111-111111111111";
const RESOURCE_ID = "22222222-2222-4222-8222-222222222222";
const DRAFT_ID = "33333333-3333-4333-8333-333333333333";

const DRAFT = {
  learningOutcomes: [{ title: "Menganalisis kedudukan warga negara" }],
  meetings: [
    {
      sequence: 1,
      title: "Kedudukan warga negara",
      objectives: ["Menjelaskan dasar konstitusional"],
      suggestedMaterials: [],
      suggestedActivities: ["Diskusi kasus"],
      assessmentSuggestions: [],
      criticalThinkingDimensions: [],
      ptaiCandidate: true,
    },
  ],
  references: [],
  warnings: [],
  ambiguities: [],
};

const PROVENANCE = {
  resourceId: RESOURCE_ID,
  resourceTitle: "RPS Pendidikan Kewarganegaraan",
  checksum: "abc123",
  extractedAt: "2026-08-31T00:00:00.000Z",
  documentType: "rps" as const,
  instruction: null,
  model: "gemini-3.5-flash-lite",
  promptVersion: 1,
  truncated: false,
};

function form(extra: Record<string, string> = {}): FormData {
  const data = new FormData();
  data.set("classId", CLASS_ID);
  data.set("resourceId", RESOURCE_ID);
  data.set("documentType", "rps");
  for (const [key, value] of Object.entries(extra)) data.set(key, value);
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  touchedTables.length = 0;
  requireLecturerOfClass.mockResolvedValue({ id: "lecturer" });
  generateQuickSetupDraft.mockResolvedValue({
    ok: true,
    draft: DRAFT,
    provenance: PROVENANCE,
  });
  insert.mockResolvedValue({ error: null });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("penyusunan draf", () => {
  it("menolak dosen di luar kelas sebelum AI dipanggil", async () => {
    requireLecturerOfClass.mockRejectedValue(new AuthorizationError());

    const state = await generateQuickSetupDraftAction({}, form());

    expect(state.ok).toBeUndefined();
    expect(generateQuickSetupDraft).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it("menyimpan draf agar bertahan setelah halaman ditutup", async () => {
    const state = await generateQuickSetupDraftAction({}, form());

    expect(state.ok).toBe(true);
    expect(insert).toHaveBeenCalledTimes(1);
    const row = insert.mock.calls[0]![0] as Record<string, unknown>;
    expect(JSON.parse(row["output"] as string)).toMatchObject({
      meetings: [{ sequence: 1 }],
    });
  });

  it("menautkan draf ke dokumen sumber beserta sidik isinya", async () => {
    await generateQuickSetupDraftAction({}, form());

    const row = insert.mock.calls[0]![0] as Record<string, unknown>;
    expect(row["source_resource_id"]).toBe(RESOURCE_ID);
    expect(row["grounding"]).toBe("source_bound");
    expect(row["model"]).toBe("gemini-3.5-flash-lite");
    expect(row["prompt_version"]).toBe(1);
    expect(row["instruction"]).toMatchObject({
      checksum: "abc123",
      extractedAt: "2026-08-31T00:00:00.000Z",
      documentType: "rps",
    });
  });

  // Draf adalah artefak penyusunan. Tidak boleh ada satu pun baris struktur
  // kelas yang lahir dari sini.
  it("tidak menyentuh tabel struktur kelas mana pun", async () => {
    await generateQuickSetupDraftAction({}, form());

    expect(touchedTables).toEqual(["ai_material_drafts"]);
  });

  it("tidak menerbitkan apa pun", async () => {
    await generateQuickSetupDraftAction({}, form());

    const row = insert.mock.calls[0]![0] as Record<string, unknown>;
    expect(row["status"]).toBeUndefined();
    expect(row["published_resource_id"]).toBeUndefined();
    expect(row["approved_by"]).toBeUndefined();
  });

  it("menyusun ulang sebagai draf baru, tanpa menimpa yang lama", async () => {
    await generateQuickSetupDraftAction({}, form());
    await generateQuickSetupDraftAction({}, form({ instruction: "ringkas" }));

    expect(insert).toHaveBeenCalledTimes(2);
    expect(update).not.toHaveBeenCalled();
  });

  it("meneruskan pesan penolakan ekstraksi apa adanya", async () => {
    generateQuickSetupDraft.mockResolvedValue({
      ok: false,
      reason: "extraction_pending",
    });

    const state = await generateQuickSetupDraftAction({}, form());

    expect(state.error).toContain("belum dapat dibaca");
    expect(insert).not.toHaveBeenCalled();
  });

  it("menolak jenis dokumen yang tidak dikenal", async () => {
    const state = await generateQuickSetupDraftAction(
      {},
      form({ documentType: "skripsi" }),
    );

    expect(state.fieldErrors?.["documentType"]).toBeDefined();
    expect(generateQuickSetupDraft).not.toHaveBeenCalled();
  });
});

describe("keputusan dosen atas draf", () => {
  function statusForm(): FormData {
    const data = new FormData();
    data.set("draftId", DRAFT_ID);
    data.set("classId", CLASS_ID);
    return data;
  }

  it("menyetujui draf tanpa membuat struktur kelas", async () => {
    const state = await approveQuickSetupDraftAction({}, statusForm());

    expect(state.ok).toBe(true);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "approved" }),
    );
    expect(touchedTables).toEqual(["ai_material_drafts"]);
    expect(state.message).toContain("belum dilakukan");
  });

  it("membuang draf tanpa menyetujuinya", async () => {
    await discardQuickSetupDraftAction({}, statusForm());

    expect(update).toHaveBeenCalledWith({ status: "discarded" });
  });

  it("menolak pembuangan oleh dosen di luar kelas", async () => {
    requireLecturerOfClass.mockRejectedValue(new AuthorizationError());

    await discardQuickSetupDraftAction({}, statusForm());

    expect(update).not.toHaveBeenCalled();
  });
});
