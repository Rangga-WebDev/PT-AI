/** @format */

// @vitest-environment node

import { describe, expect, it } from "vitest";

import {
  ADMIN_NAV,
  LECTURER_NAV,
  STUDENT_NAV,
  mobileBarItems,
  navIcons,
  type NavSection,
} from "@/lib/navigation";

const roles: [string, NavSection[]][] = [
  ["dosen", LECTURER_NAV],
  ["mahasiswa", STUDENT_NAV],
  ["admin", ADMIN_NAV],
];

describe.each(roles)("navigasi %s", (_role, sections) => {
  it("memakai ikon yang terdaftar", () => {
    for (const section of sections) {
      for (const item of section.items) {
        expect(navIcons[item.icon]).toBeDefined();
      }
    }
  });

  it("tidak memuat tujuan ganda", () => {
    const hrefs = sections.flatMap((section) =>
      section.items.map((item) => item.href),
    );
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("mengisi bilah bawah ponsel paling banyak empat tujuan", () => {
    const bar = mobileBarItems(sections);
    expect(bar.length).toBeGreaterThan(0);
    expect(bar.length).toBeLessThanOrEqual(4);
  });

  it("memakai label bilah bawah yang ringkas", () => {
    for (const item of mobileBarItems(sections)) {
      expect((item.shortLabel ?? item.label).length).toBeLessThanOrEqual(11);
    }
  });
});

describe("prioritas navigasi", () => {
  it("mendahulukan Kelas dan Review bagi dosen", () => {
    const bar = mobileBarItems(LECTURER_NAV).map((item) => item.href);

    expect(bar).toContain("/app/lecturer/classes");
    expect(bar).toContain("/app/lecturer/review");
    expect(bar).toContain("/app/lecturer/guide");
  });

  it("memisahkan perkakas dari tujuan utama dosen", () => {
    const primary = LECTURER_NAV[0]?.items.map((item) => item.href) ?? [];

    expect(primary).toEqual([
      "/app/lecturer/dashboard",
      "/app/lecturer/classes",
      "/app/lecturer/review",
      "/app/lecturer/guide",
    ]);
    expect(LECTURER_NAV[1]?.title).toBe("Perkakas");
  });

  it("menempatkan Panduan pada bilah bawah mahasiswa", () => {
    const bar = mobileBarItems(STUDENT_NAV).map((item) => item.href);

    expect(bar).toContain("/app/student/guide");
    expect(bar).not.toContain("/app/student/consent");
  });

  it("kembali ke empat tujuan pertama bila tidak ada yang ditandai", () => {
    const sections: NavSection[] = [
      {
        items: [
          { label: "Satu", href: "/a", icon: "dashboard" },
          { label: "Dua", href: "/b", icon: "classes" },
          { label: "Tiga", href: "/c", icon: "review" },
          { label: "Empat", href: "/d", icon: "guide" },
          { label: "Lima", href: "/e", icon: "settings" },
        ],
      },
    ];

    expect(mobileBarItems(sections).map((item) => item.href)).toEqual([
      "/a",
      "/b",
      "/c",
      "/d",
    ]);
  });
});
