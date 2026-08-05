/** @format */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("varian primary memenuhi spesifikasi LOCKED (44px, radius 12px, weight 600, aqua)", () => {
    render(<Button>Simpan</Button>);

    const button = screen.getByRole("button", { name: "Simpan" });
    expect(button).toHaveClass(
      "h-11",
      "rounded-lg",
      "font-semibold",
      "bg-primary",
    );
    expect(button).toHaveAttribute("data-variant", "primary");
  });

  it("varian ai memakai gaya violet tinted dengan border dan teks violet", () => {
    render(<Button variant="ai">Minta petunjuk AI</Button>);

    const button = screen.getByRole("button", { name: "Minta petunjuk AI" });
    expect(button).toHaveClass("bg-ai/12", "border-ai/45", "text-ai");
  });

  it("varian danger memakai warna coral destruktif", () => {
    render(<Button variant="danger">Hapus</Button>);

    expect(screen.getByRole("button", { name: "Hapus" })).toHaveClass(
      "bg-destructive",
      "text-destructive-foreground",
    );
  });

  it("varian outline transparan dengan border terlihat", () => {
    render(<Button variant="outline">Batal</Button>);

    expect(screen.getByRole("button", { name: "Batal" })).toHaveClass(
      "bg-transparent",
      "border-border",
    );
  });

  it("button disabled tidak dapat menerima interaksi pointer", () => {
    render(<Button disabled>Nonaktif</Button>);

    expect(screen.getByRole("button", { name: "Nonaktif" })).toBeDisabled();
  });
});
