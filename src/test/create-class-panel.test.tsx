/** @format */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CreateClassPanel } from "@/features/classes/components/create-class-form";

vi.mock("@/actions/courses/classes", () => ({
  createLecturerClassAction: vi.fn(async () => ({ ok: true })),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const COURSES = [
  {
    id: "44444444-4444-4444-8444-444444444444",
    name: "Pendidikan Kewarganegaraan",
    code: "PKN-101",
  },
  {
    id: "77777777-7777-4777-8777-777777777777",
    name: "Pengantar Ilmu Sosial",
    code: "PIS-101",
  },
];

const PERIODS = [
  {
    id: "55555555-5555-4555-8555-555555555555",
    name: "Ganjil 2026/2027",
    isActive: true,
  },
  {
    id: "88888888-8888-4888-8888-888888888888",
    name: "Genap 2025/2026",
    isActive: false,
  },
];

describe("panel buat kelas", () => {
  it("menawarkan tombol buat kelas ketika mata kuliah tersedia", () => {
    render(<CreateClassPanel courses={COURSES} periods={PERIODS} />);

    expect(
      screen.getByRole("button", { name: "+ Buat kelas" }),
    ).toBeInTheDocument();
  });

  it("mengarahkan ke admin ketika mata kuliah belum ada", () => {
    render(<CreateClassPanel courses={[]} periods={PERIODS} />);

    expect(screen.getByText(/Hubungi admin/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "+ Buat kelas" })).toBeNull();
  });

  it("tidak menampilkan formulir sebelum diminta", () => {
    render(<CreateClassPanel courses={COURSES} periods={PERIODS} />);

    expect(screen.queryByLabelText("Mata kuliah")).toBeNull();
  });

  it("hanya meminta informasi minimum kelas", async () => {
    const user = userEvent.setup();
    render(<CreateClassPanel courses={COURSES} periods={PERIODS} />);

    await user.click(screen.getByRole("button", { name: "+ Buat kelas" }));

    expect(screen.getByLabelText("Mata kuliah")).toBeInTheDocument();
    expect(screen.getByLabelText("Kelas")).toBeInTheDocument();
    expect(screen.getByLabelText("Periode akademik")).toBeInTheDocument();
    expect(screen.getByLabelText("Kapasitas (opsional)")).toBeInTheDocument();
    expect(screen.queryByLabelText(/Nama kelas/)).toBeNull();
  });

  it("memilih periode berjalan lebih dulu", async () => {
    const user = userEvent.setup();
    render(<CreateClassPanel courses={COURSES} periods={PERIODS} />);

    await user.click(screen.getByRole("button", { name: "+ Buat kelas" }));

    expect(screen.getByLabelText("Periode akademik")).toHaveValue(
      PERIODS[0]!.id,
    );
  });

  it("memperlihatkan nama kelas yang akan terbentuk", async () => {
    const user = userEvent.setup();
    render(<CreateClassPanel courses={COURSES} periods={PERIODS} />);

    await user.click(screen.getByRole("button", { name: "+ Buat kelas" }));
    await user.type(screen.getByLabelText("Kelas"), "A");

    expect(
      screen.getByText("Pendidikan Kewarganegaraan A"),
    ).toBeInTheDocument();
  });

  it("tidak menyediakan kolom untuk memilih dosen lain", async () => {
    const user = userEvent.setup();
    render(<CreateClassPanel courses={COURSES} periods={PERIODS} />);

    await user.click(screen.getByRole("button", { name: "+ Buat kelas" }));

    expect(screen.queryByLabelText(/Dosen/i)).toBeNull();
    expect(screen.queryByLabelText(/Status/i)).toBeNull();
  });
});
