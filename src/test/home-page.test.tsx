/** @format */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import HomePage from "@/app/page";

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
});
