/** @format */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { VerificationChecklist } from "@/features/verification/components/verification-checklist";

// Server Action mengimpor modul server-only; pengujian komponen memakai ganda.
vi.mock("@/actions/sources/verification", () => ({
  submitVerificationAction: vi.fn(async () => ({ ok: true })),
  linkClaimToSourceAction: vi.fn(async () => ({ ok: true })),
  unlinkClaimSourceAction: vi.fn(async () => ({ ok: true })),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const PROPS = {
  sourceId: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
  sourceVersionId: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  activityId: "1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f",
};

describe("VerificationChecklist (LOCK-PED-007)", () => {
  it("menampilkan enam kriteria verifikasi sumber", () => {
    render(<VerificationChecklist {...PROPS} />);

    expect(screen.getAllByRole("checkbox")).toHaveLength(6);
    expect(screen.getByText("0 dari 6 kriteria dinilai")).toBeInTheDocument();
  });

  it("memperbarui ringkasan ketika kriteria dinilai", async () => {
    const user = userEvent.setup();
    render(<VerificationChecklist {...PROPS} />);

    const boxes = screen.getAllByRole("checkbox");
    await user.click(boxes[0] as HTMLElement);
    await user.click(boxes[1] as HTMLElement);

    expect(screen.getByText("2 dari 6 kriteria dinilai")).toBeInTheDocument();
  });

  it("mengunci penyimpanan sampai keenam kriteria dinilai", () => {
    render(<VerificationChecklist {...PROPS} />);

    expect(
      screen.getByRole("button", { name: /Simpan verifikasi/i }),
    ).toBeDisabled();
    expect(
      screen.getByText(/Nilai keenam kriteria terlebih dahulu/i),
    ).toBeInTheDocument();
  });

  it("tetap mengunci penyimpanan ketika alasan terlalu pendek", async () => {
    const user = userEvent.setup();
    render(<VerificationChecklist {...PROPS} />);

    for (const box of screen.getAllByRole("checkbox")) {
      await user.click(box);
    }
    await user.type(screen.getByLabelText(/Alasan penilaian/i), "pendek");

    expect(
      screen.getByRole("button", { name: /Simpan verifikasi/i }),
    ).toBeDisabled();
    expect(
      screen.getByText(/Alasan penilaian minimal 10 karakter/i),
    ).toBeInTheDocument();
  });

  it("membuka penyimpanan setelah keenam kriteria dan alasan terisi", async () => {
    const user = userEvent.setup();
    render(<VerificationChecklist {...PROPS} />);

    for (const box of screen.getAllByRole("checkbox")) {
      await user.click(box);
    }
    await user.type(
      screen.getByLabelText(/Alasan penilaian/i),
      "Sumber resmi dan dapat ditelusuri ke dokumen aslinya.",
    );

    expect(
      screen.getByRole("button", { name: /Simpan verifikasi/i }),
    ).toBeEnabled();
  });
});
