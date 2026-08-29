/** @format */

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { ADMIN_STATE, LECTURER_STATE } from "./helpers/auth";

/**
 * Audit aksesibilitas otomatis. Hanya pelanggaran serious dan critical yang
 * menggagalkan pengujian: keduanya menghalangi pemakaian, bukan sekadar
 * anjuran gaya. Pemeriksaan otomatis tidak menggantikan uji manual dengan
 * pembaca layar, dan itu dicatat di docs/TESTING.md.
 */
async function auditPage(page: Page, url: string) {
  await page.goto(url);
  // Pemindaian harus menunggu halaman tenang; navigasi susulan menghancurkan
  // konteks eksekusi axe di tengah jalan.
  await page.waitForLoadState("networkidle");

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  const blocking = results.violations.filter(
    (violation) =>
      violation.impact === "serious" || violation.impact === "critical",
  );

  expect(
    blocking.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      nodes: violation.nodes.map((node) => node.target.join(" ")),
    })),
  ).toEqual([]);
}

test.describe("Audit aksesibilitas (WCAG 2.1 AA)", () => {
  // Halaman masuk diaudit tanpa sesi: dengan sesi aktif, proxy mengalihkannya
  // ke /app di tengah pemindaian dan konteks eksekusinya hilang.
  test("halaman masuk", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await auditPage(page, "/login");
    } finally {
      await context.close();
    }
  });

  test("dashboard mahasiswa", async ({ page }) => {
    await auditPage(page, "/app/student/dashboard");
  });

  test("progres mahasiswa", async ({ page }) => {
    await auditPage(page, "/app/student/progress");
  });

  test("persetujuan penelitian", async ({ page }) => {
    await auditPage(page, "/app/student/consent");
  });

  test("antrean review dosen", async ({ browser }) => {
    const context = await browser.newContext({ storageState: LECTURER_STATE });
    const page = await context.newPage();

    try {
      await auditPage(page, "/app/lecturer/review");
    } finally {
      await context.close();
    }
  });

  test("laporan respons AI", async ({ browser }) => {
    const context = await browser.newContext({ storageState: LECTURER_STATE });
    const page = await context.newPage();

    try {
      await auditPage(page, "/app/lecturer/incidents");
    } finally {
      await context.close();
    }
  });

  test("pengelolaan pengguna admin", async ({ browser }) => {
    const context = await browser.newContext({ storageState: ADMIN_STATE });
    const page = await context.newPage();

    try {
      await auditPage(page, "/app/admin/users");
    } finally {
      await context.close();
    }
  });

  test("retensi data admin", async ({ browser }) => {
    const context = await browser.newContext({ storageState: ADMIN_STATE });
    const page = await context.newPage();

    try {
      await auditPage(page, "/app/admin/retention");
    } finally {
      await context.close();
    }
  });
});
