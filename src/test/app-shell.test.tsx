/** @format */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AppShell } from "@/components/layout/app-shell";
import type { NavSection } from "@/lib/navigation";

vi.mock("next/navigation", () => ({
  usePathname: () => "/contoh",
}));

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Menu utama",
    items: [
      { label: "Dashboard", href: "/contoh", icon: "dashboard" },
      { label: "Kelas", href: "/kelas", icon: "classes" },
    ],
  },
];

describe("AppShell", () => {
  it("merender children, skip link, dan navigasi utama", () => {
    render(
      <AppShell navSections={NAV_SECTIONS}>
        <p>Konten utama halaman</p>
      </AppShell>,
    );

    expect(screen.getByText("Konten utama halaman")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Langsung ke konten utama" }),
    ).toHaveAttribute("href", "#main-content");
    expect(
      screen.getByRole("navigation", { name: "Navigasi utama" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Navigasi bawah" }),
    ).toBeInTheDocument();
  });

  it("menandai item aktif berdasarkan pathname", () => {
    render(
      <AppShell navSections={NAV_SECTIONS}>
        <p>Konten</p>
      </AppShell>,
    );

    const mainNav = screen.getByRole("navigation", { name: "Navigasi utama" });
    const activeLink = mainNav.querySelector('[aria-current="page"]');
    expect(activeLink).toHaveTextContent("Dashboard");
  });

  it("toggle collapse mengubah state sidebar melalui keyboard/klik", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <AppShell navSections={NAV_SECTIONS}>
        <p>Konten</p>
      </AppShell>,
    );

    const sidebar = container.querySelector('[data-slot="sidebar"]');
    expect(sidebar).toHaveAttribute("data-collapsed", "false");

    await user.click(screen.getByRole("button", { name: "Ciutkan navigasi" }));

    expect(sidebar).toHaveAttribute("data-collapsed", "true");
    expect(
      screen.getByRole("button", { name: "Bentangkan navigasi" }),
    ).toBeInTheDocument();
  });

  it("menampilkan judul topbar bila diberikan", () => {
    render(
      <AppShell navSections={NAV_SECTIONS} topbarTitle="Dashboard">
        <p>Konten</p>
      </AppShell>,
    );

    expect(
      screen.getByRole("heading", { name: "Dashboard" }),
    ).toBeInTheDocument();
  });
});
