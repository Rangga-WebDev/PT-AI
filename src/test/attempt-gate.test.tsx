/** @format */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { AttemptGate } from "@/features/learning-workspace/components/attempt-gate";
import { MOCK_AI_FEEDBACK } from "@/mocks/ai-feedback";

function renderGate() {
  return render(
    <AttemptGate prompt="Pertanyaan kasus" aiFeedback={MOCK_AI_FEEDBACK} />,
  );
}

describe("AttemptGate — attempt-first (LOCK-PED-004)", () => {
  it("mengunci umpan balik AI sebelum respons awal disimpan", () => {
    renderGate();

    expect(screen.getByText("Bantuan AI terkunci")).toBeInTheDocument();
    expect(screen.queryByText("Umpan balik AI")).not.toBeInTheDocument();
  });

  it("menonaktifkan tombol simpan ketika jawaban masih kosong", () => {
    renderGate();

    expect(
      screen.getByRole("button", { name: /Simpan respons awal/i }),
    ).toBeDisabled();
  });

  it("membuka umpan balik AI setelah respons awal disimpan", async () => {
    const user = userEvent.setup();
    renderGate();

    await user.type(
      screen.getByLabelText(/Tuliskan jawaban Anda/i),
      "Prosedur formal terpenuhi, tetapi partisipasi belum bermakna.",
    );
    await user.click(
      screen.getByRole("button", { name: /Simpan respons awal/i }),
    );

    expect(screen.getByText("Umpan balik AI")).toBeInTheDocument();
    expect(screen.queryByText("Bantuan AI terkunci")).not.toBeInTheDocument();
  });

  it("mempertahankan baseline sebagai teks yang tidak dapat diubah", async () => {
    const user = userEvent.setup();
    renderGate();

    const answer = "Bukti kehadiran 24 orang belum cukup mewakili.";
    await user.type(screen.getByLabelText(/Tuliskan jawaban Anda/i), answer);
    await user.click(
      screen.getByRole("button", { name: /Simpan respons awal/i }),
    );

    expect(screen.getByText(/tidak dapat diubah/i)).toBeInTheDocument();
    expect(screen.getByText(answer)).toBeInTheDocument();
    expect(
      screen.queryByLabelText(/Tuliskan jawaban Anda/i),
    ).not.toBeInTheDocument();
  });

  it("menampilkan batas peran AI setelah panel terbuka", async () => {
    const user = userEvent.setup();
    renderGate();

    await user.type(screen.getByLabelText(/Tuliskan jawaban Anda/i), "Jawaban");
    await user.click(
      screen.getByRole("button", { name: /Simpan respons awal/i }),
    );

    expect(screen.getByText("Batas peran AI")).toBeInTheDocument();
  });
});
