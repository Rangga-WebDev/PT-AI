/** @format */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { MockBanner } from "@/components/shared/mock-banner";
import { VerificationChecklist } from "@/features/verification/components/verification-checklist";
import { VERIFICATION_CRITERIA } from "@/mocks/sources";

describe("VerificationChecklist", () => {
  it("menampilkan enam kriteria verifikasi sumber", () => {
    render(<VerificationChecklist criteria={VERIFICATION_CRITERIA} />);

    expect(screen.getAllByRole("checkbox")).toHaveLength(6);
    expect(screen.getByText("0 dari 6 kriteria diperiksa")).toBeInTheDocument();
  });

  it("memperbarui ringkasan ketika kriteria dicentang", async () => {
    const user = userEvent.setup();
    render(<VerificationChecklist criteria={VERIFICATION_CRITERIA} />);

    const boxes = screen.getAllByRole("checkbox");
    await user.click(boxes[0] as HTMLElement);
    await user.click(boxes[1] as HTMLElement);

    expect(screen.getByText("2 dari 6 kriteria diperiksa")).toBeInTheDocument();
  });

  it("menyatakan bahwa hasil verifikasi belum disimpan pada prototipe", () => {
    render(<VerificationChecklist criteria={VERIFICATION_CRITERIA} />);

    expect(screen.getByText(/belum disimpan/i)).toBeInTheDocument();
  });
});

describe("MockBanner", () => {
  it("menandai halaman sebagai data contoh", () => {
    render(<MockBanner />);

    expect(screen.getByRole("note")).toHaveTextContent("Data contoh (MOCK)");
  });
});
