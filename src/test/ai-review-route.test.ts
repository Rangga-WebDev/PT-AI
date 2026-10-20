/** @format */

// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthorizationError } from "@/lib/errors";
import type { ReviewStreamEvent } from "@/lib/ai/review-stream";

const requireRoleOrThrow = vi.fn();
const consumeRateLimit = vi.fn();
const prepareReview = vi.fn();
const streamReview = vi.fn();

const ATTEMPT_ID = "11111111-1111-4111-8111-111111111111";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/auth", () => ({
  requireRoleOrThrow: (...roles: string[]) => requireRoleOrThrow(...roles),
}));

vi.mock("@/server/services/rate-limit", () => ({
  consumeRateLimit: (action: string) => consumeRateLimit(action),
  RATE_LIMIT_MESSAGE: { ai_review: "Batas bantuan review AI tercapai." },
}));

vi.mock("@/server/ai/provider", () => ({ CHAT_MODEL: "model-uji" }));
vi.mock("@/server/ai/review-prompt", () => ({ REVIEW_PROMPT_VERSION: 7 }));

vi.mock("@/server/ai/lecturer-review", () => ({
  prepareReview: (id: string) => prepareReview(id),
  streamReview: (prepared: unknown, lecturerId: string) =>
    streamReview(prepared, lecturerId),
  REVIEW_MESSAGE: {
    no_rubric: "Belum ada rubrik.",
    untraceable_citation: "Hasil ditolak.",
  },
}));

const { POST } = await import("@/app/api/lecturer/ai-review/route");

function call(body: unknown, contentType = "application/json") {
  return POST(
    new Request("http://localhost/api/lecturer/ai-review", {
      method: "POST",
      headers: { "content-type": contentType },
      body: JSON.stringify(body),
    }),
  );
}

async function readEvents(response: Response): Promise<ReviewStreamEvent[]> {
  const text = await response.text();
  return text
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as ReviewStreamEvent);
}

const PREPARED = {
  ok: true,
  classId: "class-1",
  studentId: "student-1",
  activityId: "activity-1",
  packet: {
    attemptId: ATTEMPT_ID,
    criteria: [{ id: "k1", code: "A1", levels: [] }],
    artifacts: [
      {
        id: "art-1",
        label: "Respons awal",
        content: "Isi jawaban mahasiswa yang tidak boleh ikut terkirim.",
        studentAuthored: true,
      },
    ],
  },
};

const ENTRY = {
  criterionId: "k1",
  suggestedScore: 3,
  confidence: "medium",
  evidence: [],
  rationale: "Alasan yang cukup panjang.",
  insufficientEvidence: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  requireRoleOrThrow.mockResolvedValue({ id: "lecturer-1" });
  consumeRateLimit.mockResolvedValue(true);
  prepareReview.mockResolvedValue(PREPARED);
  streamReview.mockImplementation(async function* () {
    yield { type: "criterion", entry: ENTRY };
    yield { type: "error", reason: "untraceable_citation" };
  });
});

describe("POST /api/lecturer/ai-review", () => {
  it("menolak permintaan yang bukan JSON", async () => {
    const response = await call({ attemptId: ATTEMPT_ID }, "text/plain");

    expect(response.status).toBe(415);
    expect(requireRoleOrThrow).not.toHaveBeenCalled();
  });

  it("menolak selain dosen", async () => {
    requireRoleOrThrow.mockRejectedValue(new AuthorizationError());

    const response = await call({ attemptId: ATTEMPT_ID });

    expect(response.status).toBe(403);
    expect(consumeRateLimit).not.toHaveBeenCalled();
  });

  it("menolak id pekerjaan yang tidak sah", async () => {
    const response = await call({ attemptId: "bukan-uuid" });

    expect(response.status).toBe(400);
  });

  it("menolak sebelum menyiapkan bukti ketika batas tercapai", async () => {
    consumeRateLimit.mockResolvedValue(false);

    const response = await call({ attemptId: ATTEMPT_ID });

    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({
      error: "Batas bantuan review AI tercapai.",
    });
    expect(prepareReview).not.toHaveBeenCalled();
  });

  it("melaporkan pekerjaan tanpa rubrik sebelum aliran dimulai", async () => {
    prepareReview.mockResolvedValue({ ok: false, reason: "no_rubric" });

    const response = await call({ attemptId: ATTEMPT_ID });

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: "Belum ada rubrik." });
    expect(streamReview).not.toHaveBeenCalled();
  });

  it("mengalirkan meta, kriteria, lalu galat yang sudah diterjemahkan", async () => {
    const response = await call({ attemptId: ATTEMPT_ID });

    expect(response.headers.get("content-type")).toContain(
      "application/x-ndjson",
    );
    expect(streamReview).toHaveBeenCalledWith(PREPARED, "lecturer-1");

    const events = await readEvents(response);
    expect(events.map((event) => event.type)).toEqual([
      "meta",
      "criterion",
      "error",
    ]);
    expect(events[0]).toMatchObject({
      model: "model-uji",
      promptVersion: 7,
      artifacts: [
        { id: "art-1", label: "Respons awal", studentAuthored: true },
      ],
    });
    expect(JSON.stringify(events[0])).not.toContain("tidak boleh ikut");
    expect(events[2]).toEqual({ type: "error", error: "Hasil ditolak." });
  });
});
