/** @format */

import { expect, test } from "@playwright/test";

import { seedAnalyticsSample } from "./fixtures/analytics";

const STUDENT_STATE = "playwright/.auth/student.json";

test.describe("Analitik dan laporan AI (LOCK-PED-008, SEC-005)", () => {
  test.describe.configure({ mode: "serial" });

  let classId: string;
  let score: number;

  test.beforeAll(async () => {
    const sample = await seedAnalyticsSample();
    classId = sample.classId;
    score = sample.score;
  });

  test("analitik kelas menampilkan distribusi dan peristiwa nyata", async ({
    page,
  }) => {
    await page.goto(`/app/lecturer/classes/${classId}/analytics`);

    await expect(
      page.getByRole("heading", { name: "Analitik kelas" }),
    ).toBeVisible();
    await expect(
      page.locator('[data-slot="mastery-distribution"]'),
    ).toBeVisible();
    await expect(page.locator('[data-slot="event-summary"]')).toContainText(
      "Respons awal dikirim",
    );
  });

  test("checklist keterlaksanaan tersimpan dan terbaca kembali", async ({
    page,
  }) => {
    await page.goto(`/app/lecturer/classes/${classId}/analytics`);

    const form = page.locator('[data-slot="fidelity-form"]');
    await expect(form).toBeVisible();

    await form
      .getByRole("listitem")
      .filter({ hasText: "Respons awal ditulis sebelum bantuan AI" })
      .getByRole("button", { name: "Terlaksana" })
      .click();

    await expect(page.locator('[data-slot="fidelity-summary"]')).toContainText(
      "terlaksana",
    );
  });

  test("halaman laporan AI dapat dibuka dosen", async ({ page }) => {
    await page.goto("/app/lecturer/incidents");

    await expect(
      page.getByRole("heading", { name: "Laporan respons AI" }),
    ).toBeVisible();
  });

  test("penanganan insiden menuntut catatan yang memadai", async ({ page }) => {
    await page.goto("/app/lecturer/incidents");

    const first = page.locator('[data-slot="incident-item"]').first();
    const hasIncident = (await first.count()) > 0;
    test.skip(!hasIncident, "Belum ada insiden yang dilaporkan mahasiswa");

    await first.getByLabel("Catatan penyelesaian").fill("pendek");
    await expect(first.locator('[data-slot="submit-incident"]')).toBeDisabled();
  });

  test("mahasiswa melihat pengukuran dimensinya sendiri", async ({
    browser,
  }) => {
    const context = await browser.newContext({ storageState: STUDENT_STATE });
    const page = await context.newPage();

    try {
      await page.goto("/app/student/progress");

      const bars = page.locator('[data-slot="dimension-bars"]');
      await expect(bars).toBeVisible();
      await expect(bars).toContainText(String(score));
      await expect(bars).toContainText("Analisis");
    } finally {
      await context.close();
    }
  });

  test("dashboard mahasiswa menampilkan dimensi tanpa mengarang angka", async ({
    browser,
  }) => {
    const context = await browser.newContext({ storageState: STUDENT_STATE });
    const page = await context.newPage();

    try {
      await page.goto("/app/student/dashboard");

      await expect(
        page.getByRole("heading", { name: "Enam dimensi berpikir kritis" }),
      ).toBeVisible();

      // Hanya dimensi yang benar-benar diukur yang muncul; tidak ada baris nol.
      const bars = page.locator('[data-slot="dimension-bars"] > li');
      await expect(bars).toHaveCount(1);
    } finally {
      await context.close();
    }
  });
});
