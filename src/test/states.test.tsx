/** @format */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EmptyState } from "@/components/shared/states/empty-state";
import { ErrorState } from "@/components/shared/states/error-state";
import { ForbiddenState } from "@/components/shared/states/forbidden-state";
import { LoadingState } from "@/components/shared/states/loading-state";
import { LockedState } from "@/components/shared/states/locked-state";

describe("Komponen states", () => {
  it("LoadingState memakai role status dengan label default Bahasa Indonesia", () => {
    render(<LoadingState />);

    const region = screen.getByRole("status");
    expect(region).toHaveTextContent("Memuat data…");
  });

  it("EmptyState menampilkan judul default dan slot action", () => {
    render(
      <EmptyState
        description="Belum ada kelas."
        action={<button type="button">Muat ulang</button>}
      />,
    );

    expect(screen.getByText("Belum ada data")).toBeInTheDocument();
    expect(screen.getByText("Belum ada kelas.")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Muat ulang" }),
    ).toBeInTheDocument();
  });

  it("ErrorState memakai role alert", () => {
    render(<ErrorState />);

    expect(screen.getByRole("alert")).toHaveTextContent("Terjadi kesalahan");
  });

  it("ForbiddenState menampilkan pesan akses ditolak", () => {
    render(<ForbiddenState />);

    expect(screen.getByText("Akses ditolak")).toBeInTheDocument();
  });

  it("LockedState menjelaskan alasan terkunci", () => {
    render(<LockedState />);

    expect(screen.getByText("Tahap terkunci")).toBeInTheDocument();
    expect(
      screen.getByText(/Selesaikan tahap sebelumnya/i),
    ).toBeInTheDocument();
  });
});
