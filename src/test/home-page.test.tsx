/** @format */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Formulir masuk menarik Server Action yang memuat `server-only`; rantai itu
// tidak dapat diimpor dari lingkungan uji klien.
vi.mock("@/actions/auth/sign-in", () => ({
  signIn: vi.fn(),
}));

const { default: HomePage } = await import("@/app/page");

describe("HomePage", () => {
  it("menampilkan judul aplikasi dalam Bahasa Indonesia", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /PT-AI Learning Management System/i,
      }),
    ).toBeInTheDocument();
  });

  it("menampilkan deskripsi tujuan pembelajaran", () => {
    render(<HomePage />);

    expect(screen.getByText(/berpikir kritis/i)).toBeInTheDocument();
  });

  it("menempatkan formulir masuk sebagai tindakan utama", () => {
    render(<HomePage />);

    expect(screen.getByLabelText("Surel institusi")).toBeInTheDocument();
    expect(screen.getByLabelText("Kata sandi")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Masuk" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Lupa kata sandi/i }),
    ).toBeInTheDocument();
  });
});
