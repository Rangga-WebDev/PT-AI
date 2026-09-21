/** @format */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const action = vi.hoisted(() => vi.fn());
vi.mock("@/actions/auth/register", () => ({ registerStudentAction: action }));
import { RegisterStudentForm } from "@/features/auth/components/register-student-form";

beforeEach(() => action.mockReset());

describe("formulir pendaftaran mahasiswa", () => {
  it("hanya meminta identitas mahasiswa, bukan pilihan peran atau institusi", () => {
    render(<RegisterStudentForm />);
    expect(screen.getByLabelText("NIM")).toHaveAttribute(
      "inputmode",
      "numeric",
    );
    expect(screen.getByLabelText("Surel mahasiswa")).toHaveAttribute(
      "type",
      "email",
    );
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });
  it("menutup pendaftaran ketika institusi belum dikonfigurasi", () => {
    render(<RegisterStudentForm available={false} />);
    expect(
      screen.getByRole("button", { name: "Daftar mahasiswa" }),
    ).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("belum dibuka");
  });
  it("menampilkan sukses dan tautan masuk tanpa menyimpan kata sandi di halaman", async () => {
    action.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    render(<RegisterStudentForm />);
    await user.type(screen.getByLabelText("Nama lengkap"), "Mahasiswa Satu");
    await user.type(screen.getByLabelText("NIM"), "001234567890");
    await user.type(
      screen.getByLabelText("Surel mahasiswa"),
      "mhs@student.unismuh.ac.id",
    );
    await user.type(
      screen.getByLabelText("Kata sandi", { exact: true }),
      "sandi-mahasiswa-2026",
    );
    await user.type(
      screen.getByLabelText("Konfirmasi kata sandi"),
      "sandi-mahasiswa-2026",
    );
    await user.click(screen.getByRole("button", { name: "Daftar mahasiswa" }));
    expect(await screen.findByRole("status")).toHaveTextContent(
      "berhasil dibuat",
    );
    expect(screen.getByRole("link", { name: "Masuk ke akun" })).toHaveAttribute(
      "href",
      "/login",
    );
    expect(
      screen.queryByLabelText("Kata sandi", { exact: true }),
    ).not.toBeInTheDocument();
  });
  it("menampilkan galat NIM dari server", async () => {
    action.mockResolvedValue({
      fieldErrors: { identifier: ["NIM tidak valid."] },
    });
    render(<RegisterStudentForm />);
    await userEvent.click(
      screen.getByRole("button", { name: "Daftar mahasiswa" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "NIM tidak valid",
    );
    expect(screen.getByLabelText("NIM")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });
});
