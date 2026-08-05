/** @format */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StatusBadge } from "@/components/shared/status-badge";

describe("StatusBadge", () => {
  it("menampilkan label dan atribut status", () => {
    render(<StatusBadge status="verified">Terverifikasi</StatusBadge>);

    const badge = screen.getByText("Terverifikasi");
    expect(badge).toHaveAttribute("data-status", "verified");
    expect(badge).toHaveClass("text-success");
  });

  it("memakai status draft sebagai default", () => {
    render(<StatusBadge>Draf</StatusBadge>);

    expect(screen.getByText("Draf")).toHaveAttribute("data-status", "draft");
  });

  it("status ai memakai aksen violet", () => {
    render(<StatusBadge status="ai">Saran AI</StatusBadge>);

    expect(screen.getByText("Saran AI")).toHaveClass("bg-ai/12");
  });

  it("dot indikator dapat dimatikan", () => {
    const { container } = render(
      <StatusBadge withDot={false}>Tanpa dot</StatusBadge>,
    );

    expect(
      container.querySelector('[data-status] > span[aria-hidden="true"]'),
    ).not.toBeInTheDocument();
  });
});
