/** @format */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AttemptGate } from "@/features/learning-workspace/components/attempt-gate";

// Server Action mengimpor modul server-only; pengujian komponen memakai ganda.
vi.mock("@/actions/learning/attempts", () => ({
  saveDraftAction: vi.fn(async () => ({ ok: true, savedAt: "" })),
  submitAttemptAction: vi.fn(async () => ({ ok: true, baselineId: "x" })),
}));

vi.mock("@/actions/ai/coach", () => ({
  requestAiFeedbackAction: vi.fn(async () => ({ ok: true })),
  markFeedbackAction: vi.fn(async () => ({ ok: true })),
  verifyCitationAction: vi.fn(async () => ({ ok: true })),
  reportAiIncidentAction: vi.fn(async () => ({ ok: true })),
  submitAiDisclosureAction: vi.fn(async () => ({ ok: true })),
}));

vi.mock("@/actions/learning/revisions", () => ({
  submitRevisionAction: vi.fn(async () => ({ ok: true })),
  submitReflectionAction: vi.fn(async () => ({ ok: true })),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const BASE_PROPS = {
  activityId: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
  classId: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  prompt: "Pertanyaan kasus",
  responseSchema: "free_text",
  initialDraft: "",
  initialSavedAt: null,
  allowsAi: true,
  allowedFunctions: ["guiding_questions" as const],
  feedbackItems: [],
  disclosure: null,
  revisions: [],
  reflection: null,
};

const BASELINE = {
  id: "1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f",
  content: "Prosedur formal terpenuhi, partisipasi belum bermakna.",
  submittedAt: "2026-08-28T03:00:00.000Z",
};

describe("AttemptGate — attempt-first (LOCK-PED-004)", () => {
  it("mengunci umpan balik AI sebelum respons awal tersimpan", () => {
    render(<AttemptGate {...BASE_PROPS} baseline={null} />);

    expect(screen.getByText("Bantuan AI terkunci")).toBeInTheDocument();
    expect(screen.queryByText("Umpan balik AI")).not.toBeInTheDocument();
  });

  it("menonaktifkan tombol kirim ketika jawaban masih kosong", () => {
    render(<AttemptGate {...BASE_PROPS} baseline={null} />);

    expect(
      screen.getByRole("button", { name: /Simpan respons awal/i }),
    ).toBeDisabled();
  });

  it("memulihkan draf yang tersimpan sebelumnya", () => {
    render(
      <AttemptGate
        {...BASE_PROPS}
        initialDraft="Draf yang belum dikirim."
        initialSavedAt="2026-08-28T03:00:00.000Z"
        baseline={null}
      />,
    );

    expect(screen.getByLabelText(/Tuliskan jawaban Anda/i)).toHaveValue(
      "Draf yang belum dikirim.",
    );
    expect(screen.getByRole("status").textContent).toMatch(
      /Draf tersimpan \d{2}[.:]\d{2}/,
    );
  });

  it("membuka umpan balik AI ketika baseline sudah ada", () => {
    render(<AttemptGate {...BASE_PROPS} baseline={BASELINE} />);

    expect(screen.getByText("Umpan balik AI")).toBeInTheDocument();
    expect(screen.getByText("Batas peran AI")).toBeInTheDocument();
    expect(screen.queryByText("Bantuan AI terkunci")).not.toBeInTheDocument();
  });

  it("menampilkan baseline sebagai teks permanen tanpa editor", () => {
    render(<AttemptGate {...BASE_PROPS} baseline={BASELINE} />);

    expect(screen.getByText(/tidak dapat diubah/i)).toBeInTheDocument();
    expect(screen.getByText(BASELINE.content)).toBeInTheDocument();
    expect(
      screen.queryByLabelText(/Tuliskan jawaban Anda/i),
    ).not.toBeInTheDocument();
  });

  it("menyembunyikan panel AI ketika dosen tidak mengizinkannya", () => {
    render(
      <AttemptGate {...BASE_PROPS} allowsAi={false} baseline={BASELINE} />,
    );

    expect(screen.queryByText("Umpan balik AI")).not.toBeInTheDocument();
    expect(
      screen.getByText(/tidak mengaktifkan bantuan AI/i),
    ).toBeInTheDocument();
  });

  it("hanya menawarkan fungsi AI yang diizinkan dosen", () => {
    render(
      <AttemptGate
        {...BASE_PROPS}
        allowedFunctions={["hint" as const]}
        baseline={BASELINE}
      />,
    );

    expect(
      screen.getByRole("button", { name: /Petunjuk/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Pertanyaan penuntun/i }),
    ).not.toBeInTheDocument();
  });

  it("meminta pernyataan penggunaan AI setelah baseline tersimpan", () => {
    render(<AttemptGate {...BASE_PROPS} baseline={BASELINE} />);

    expect(
      screen.getByRole("heading", { name: "Pernyataan penggunaan AI" }),
    ).toBeInTheDocument();
  });
});
