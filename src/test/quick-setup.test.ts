/** @format */

// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthorizationError } from "@/lib/errors";
import type { AiProvider } from "@/server/ai/types";

const requireLecturerOfClass = vi.fn();
const maybeSingle = vi.fn();
const insert = vi.fn();

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/auth", () => ({
  requireLecturerOfClass: (classId: string) => requireLecturerOfClass(classId),
}));

// Rantai PostgREST dipalsukan seadanya; yang diuji adalah urutan keputusan,
// bukan pembangun kuerinya.
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          eq: () => ({ is: () => ({ maybeSingle: () => maybeSingle(table) }) }),
          maybeSingle: () => maybeSingle(table),
        }),
      }),
      insert: (row: Record<string, unknown>) => insert(row),
    }),
  }),
}));

const { generateQuickSetupDraft } = await import("@/server/ai/quick-setup");
const { setProvider } = await import("@/server/ai/provider");
const { quickSetupDraftSchema } = await import("@/lib/ai/quick-setup-schema");

const CLASS_ID = "11111111-1111-4111-8111-111111111111";
const RESOURCE_ID = "22222222-2222-4222-8222-222222222222";

const VALID_OUTPUT = {
  course: { title: "Pendidikan Kewarganegaraan" },
  learningOutcomes: [
    {
      code: "CPMK1",
      title: "Menganalisis kedudukan warga negara",
      type: "CPMK",
    },
  ],
  meetings: [
    {
      sequence: 1,
      title: "Kedudukan warga negara",
      topic: "Hak dan kewajiban",
      objectives: ["Menjelaskan dasar konstitusional kewarganegaraan"],
      suggestedMaterials: ["UUD 1945 Pasal 26"],
      suggestedActivities: ["Diskusi kasus status kewarganegaraan"],
      assessmentSuggestions: ["Esai argumentatif"],
      criticalThinkingDimensions: ["analysis", "evaluation"],
      ptaiCandidate: true,
      ptaiRationale: "Topik memuat isu publik yang menuntut penimbangan bukti.",
    },
  ],
  references: [{ title: "Kaelan, Pendidikan Kewarganegaraan" }],
  warnings: [],
  ambiguities: ["Jumlah pertemuan tidak dinyatakan eksplisit."],
};

let promptSeen = "";

function stubProvider(text: string): AiProvider {
  return {
    async generateStructured({ prompt }) {
      promptSeen = prompt;
      return { text, inputTokens: 10, outputTokens: 10, latencyMs: 1 };
    },
    async embed(texts) {
      return texts.map(() => []);
    },
  };
}

function resource(overrides: Record<string, unknown> = {}) {
  return {
    data: {
      id: RESOURCE_ID,
      class_id: CLASS_ID,
      title: "RPS Pendidikan Kewarganegaraan",
      checksum: "abc123",
      extraction_status: "succeeded",
      extracted_text: "Pertemuan 1 membahas kedudukan warga negara.",
      extracted_at: "2026-08-31T00:00:00.000Z",
      ...overrides,
    },
  };
}

function request() {
  return {
    classId: CLASS_ID,
    resourceId: RESOURCE_ID,
    documentType: "rps" as const,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  promptSeen = "";
  requireLecturerOfClass.mockResolvedValue({ id: "lecturer" });
  maybeSingle.mockImplementation((table: string) =>
    table === "classes"
      ? {
          data: {
            name: "PKN A",
            courses: { name: "Pendidikan Kewarganegaraan" },
          },
        }
      : resource(),
  );
  insert.mockResolvedValue({ error: null });
  setProvider(stubProvider(JSON.stringify(VALID_OUTPUT)));
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  setProvider(null);
  vi.restoreAllMocks();
});

describe("otorisasi Quick Setup", () => {
  it("menolak dosen di luar kelas sebelum dokumen dibaca", async () => {
    requireLecturerOfClass.mockRejectedValue(new AuthorizationError());

    const result = await generateQuickSetupDraft(request());

    expect(result).toEqual({ ok: false, reason: "forbidden" });
    expect(maybeSingle).not.toHaveBeenCalled();
  });

  // Hubungan dokumen dengan kelas tidak boleh dipercaya dari klien.
  it("menolak dokumen yang tidak terlihat lewat sesi dosen", async () => {
    maybeSingle.mockResolvedValue({ data: null });

    const result = await generateQuickSetupDraft(request());

    expect(result).toEqual({ ok: false, reason: "resource_not_found" });
  });
});

describe("syarat keterbacaan dokumen", () => {
  it("menolak dokumen yang ekstraksinya masih tertunda", async () => {
    maybeSingle.mockResolvedValue(
      resource({ extraction_status: "pending", extracted_text: null }),
    );

    const result = await generateQuickSetupDraft(request());

    expect(result).toEqual({ ok: false, reason: "extraction_pending" });
    expect(promptSeen).toBe("");
  });

  it("menolak dokumen yang ekstraksinya gagal", async () => {
    maybeSingle.mockResolvedValue(
      resource({ extraction_status: "failed", extracted_text: null }),
    );

    const result = await generateQuickSetupDraft(request());

    expect(result).toEqual({ ok: false, reason: "extraction_failed" });
  });

  it("menolak dokumen berstatus succeeded tetapi tanpa teks", async () => {
    maybeSingle.mockResolvedValue(
      resource({ extraction_status: "succeeded", extracted_text: null }),
    );

    const result = await generateQuickSetupDraft(request());

    expect(result.ok).toBe(false);
    expect(promptSeen).toBe("");
  });

  it("menerima dokumen yang isinya sudah terbaca", async () => {
    const result = await generateQuickSetupDraft(request());

    expect(result.ok).toBe(true);
  });
});

describe("isi yang dikirim ke AI", () => {
  it("mengirim teks dokumen yang sebenarnya", async () => {
    await generateQuickSetupDraft(request());

    expect(promptSeen).toContain(
      "Pertemuan 1 membahas kedudukan warga negara.",
    );
  });

  // Metadata berkas bukan isi dokumen. Mengirimkannya lalu menyebutnya
  // "membaca dokumen" adalah kebohongan yang paling mudah terjadi di sini.
  it("tidak memakai nama berkas sebagai pengganti isi dokumen", async () => {
    maybeSingle.mockImplementation((table: string) =>
      table === "classes"
        ? { data: { name: "PKN A", courses: { name: "PKN" } } }
        : resource({
            title: "rps-pkn.pdf",
            extracted_text: "Isi sebenarnya dari dokumen.",
          }),
    );

    await generateQuickSetupDraft(request());

    expect(promptSeen).toContain("Isi sebenarnya dari dokumen.");
    const body = promptSeen.split("=== ISI DOKUMEN ===")[1] ?? "";
    expect(body).not.toContain("rps-pkn.pdf");
  });

  it("melarang mengarang lewat instruksi sistem", async () => {
    const { QUICK_SETUP_SYSTEM_INSTRUCTION } =
      await import("@/server/ai/quick-setup-prompt");

    // Dinormalkan agar pembungkusan baris tidak memutus asersi.
    const instruction = QUICK_SETUP_SYSTEM_INSTRUCTION.replace(/\s+/g, " ");

    expect(instruction).toContain("Jangan mengarang.");
    expect(instruction).toContain("Jangan menilai mahasiswa");
    expect(instruction).toContain('catat di "ambiguities"');
  });
});

describe("validasi keluaran AI", () => {
  it("menolak keluaran yang bukan JSON", async () => {
    setProvider(stubProvider("bukan json sama sekali"));

    const result = await generateQuickSetupDraft(request());

    expect(result).toEqual({ ok: false, reason: "invalid_output" });
  });

  it("menolak keluaran yang tidak lolos skema", async () => {
    setProvider(
      stubProvider(JSON.stringify({ meetings: [{ sequence: 0, title: "x" }] })),
    );

    const result = await generateQuickSetupDraft(request());

    expect(result).toEqual({ ok: false, reason: "invalid_output" });
  });

  it("menolak dimensi berpikir kritis di luar enam yang sah", async () => {
    const parsed = quickSetupDraftSchema.safeParse({
      ...VALID_OUTPUT,
      meetings: [
        {
          ...VALID_OUTPUT.meetings[0],
          criticalThinkingDimensions: ["creativity"],
        },
      ],
    });

    expect(parsed.success).toBe(false);
  });

  it("melaporkan penyedia yang gagal tanpa membocorkan pesan aslinya", async () => {
    setProvider({
      async generateStructured() {
        throw new Error("GEMINI_API_KEY rahasia bocor di sini");
      },
      async embed() {
        return [];
      },
    });

    const result = await generateQuickSetupDraft(request());

    expect(result).toEqual({ ok: false, reason: "provider_error" });
  });
});

describe("provenance", () => {
  it("mencatat dokumen, sidik isi, dan waktu ekstraksinya", async () => {
    const result = await generateQuickSetupDraft(request());

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.provenance).toMatchObject({
      resourceId: RESOURCE_ID,
      resourceTitle: "RPS Pendidikan Kewarganegaraan",
      checksum: "abc123",
      extractedAt: "2026-08-31T00:00:00.000Z",
      documentType: "rps",
      promptVersion: 1,
    });
    expect(result.provenance.model).toContain("gemini");
  });

  it("memisahkan fakta dokumen dari saran AI pada hasilnya", async () => {
    const result = await generateQuickSetupDraft(request());

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const meeting = result.draft.meetings[0]!;
    expect(meeting.objectives).toEqual([
      "Menjelaskan dasar konstitusional kewarganegaraan",
    ]);
    expect(meeting.suggestedActivities).toEqual([
      "Diskusi kasus status kewarganegaraan",
    ]);
    expect(meeting.ptaiCandidate).toBe(true);
  });
});
