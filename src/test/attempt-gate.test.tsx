/** @format */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AttemptGate } from "@/features/learning-workspace/components/attempt-gate";
import { MOCK_AI_FEEDBACK } from "@/mocks/ai-feedback";

// Server Action mengimpor modul server-only; pengujian komponen memakai ganda.
vi.mock("@/actions/learning/attempts", () => ({
  saveDraftAction: vi.fn(async () => ({ ok: true, savedAt: "" })),
  submitAttemptAction: vi.fn(async () => ({ ok: true, baselineId: "x" })),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const BASE_PROPS = {
  activityId: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
  prompt: "Pertanyaan kasus",
  initialDraft: "",
  initialSavedAt: null,
  aiFeedback: MOCK_AI_FEEDBACK,
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
    expect(screen.getByRole("status", { name: "" }).textContent).toMatch(
      /Draf tersimpan \d{2}[.:]\d{2}/,
    );
  });

  it("membuka umpan balik AI ketika baseline sudah ada", () => {
    render(
      <AttemptGate
        {...BASE_PROPS}
        baseline={{
          content: "Prosedur formal terpenuhi, partisipasi belum bermakna.",
          submittedAt: "2026-08-28T03:00:00.000Z",
        }}
      />,
    );

    expect(screen.getByText("Umpan balik AI")).toBeInTheDocument();
    expect(screen.getByText("Batas peran AI")).toBeInTheDocument();
    expect(screen.queryByText("Bantuan AI terkunci")).not.toBeInTheDocument();
  });

  it("menampilkan baseline sebagai teks permanen tanpa editor", () => {
    const content = "Bukti kehadiran 24 orang belum cukup mewakili.";
    render(
      <AttemptGate
        {...BASE_PROPS}
        baseline={{ content, submittedAt: "2026-08-28T03:00:00.000Z" }}
      />,
    );

    expect(screen.getByText(/tidak dapat diubah/i)).toBeInTheDocument();
    expect(screen.getByText(content)).toBeInTheDocument();
    expect(
      screen.queryByLabelText(/Tuliskan jawaban Anda/i),
    ).not.toBeInTheDocument();
  });
});
