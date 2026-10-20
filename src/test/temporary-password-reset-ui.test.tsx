/** @format */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TemporaryPasswordReset } from "@/features/auth/components/temporary-password-reset";

describe("TemporaryPasswordReset", () => {
  it("meminta konfirmasi lalu menampilkan kata sandi sementara sekali", async () => {
    const action = vi.fn(async () => ({ temporaryPassword: "Ptai-ABCD-EFGH-JK23" }));
    const user = userEvent.setup();
    render(<TemporaryPasswordReset action={action} subjectName="Ani" />);

    await user.click(screen.getByRole("button", { name: "Atur ulang kata sandi" }));
    expect(action).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Ya, atur ulang" }));

    expect(action).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Ptai-ABCD-EFGH-JK23")).toBeInTheDocument();
    expect(screen.getByText(/wajib membuat kata sandi baru/)).toBeInTheDocument();
  });

  it("membatalkan tanpa memanggil aksi", async () => {
    const action = vi.fn();
    const user = userEvent.setup();
    render(<TemporaryPasswordReset action={action} subjectName="Ani" />);

    await user.click(screen.getByRole("button", { name: "Atur ulang kata sandi" }));
    await user.click(screen.getByRole("button", { name: "Batal" }));

    expect(action).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Atur ulang kata sandi" }),
    ).toBeInTheDocument();
  });

  it("menampilkan galat dari server", async () => {
    const action = vi.fn(async () => ({
      error: "Mahasiswa tidak terdaftar aktif di kelas ini.",
    }));
    const user = userEvent.setup();
    render(<TemporaryPasswordReset action={action} subjectName="Ani" />);

    await user.click(screen.getByRole("button", { name: "Atur ulang kata sandi" }));
    await user.click(screen.getByRole("button", { name: "Ya, atur ulang" }));

    expect(
      await screen.findByText("Mahasiswa tidak terdaftar aktif di kelas ini."),
    ).toBeInTheDocument();
  });
});
