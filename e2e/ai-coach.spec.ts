/** @format */

import { expect, test, type Page } from "@playwright/test";

import { createDisposableUnit } from "./fixtures/learning-content";

// Berjalan dengan sesi mahasiswa (project "student") dan provider AI palsu
// (AI_PROVIDER_MODE=fake) agar deterministik dan tidak memakai kuota.

test.describe("Bantuan AI (LOCK-PED-004, 005, 006)", () => {
  test.describe.configure({ mode: "serial" });

  let stageUrl: string;

  test.beforeAll(async () => {
    const { unitId } = await createDisposableUnit();
    stageUrl = `/app/student/learn/${unitId}/stage/interpretation`;
  });

  async function openStage(page: Page) {
    await page.goto(stageUrl);
    await expect(
      page.getByRole("heading", { name: "1. Interpretasi" }),
    ).toBeVisible();
  }

  test("bantuan AI terkunci sebelum respons awal terkirim", async ({
    page,
  }) => {
    await openStage(page);

    await expect(page.locator('[data-slot="ai-locked"]')).toBeVisible();
    await expect(page.locator('[data-slot="ai-feedback-panel"]')).toHaveCount(
      0,
    );
  });

  test("panel AI terbuka setelah baseline tersimpan", async ({ page }) => {
    await openStage(page);

    await page
      .getByLabel(/Tuliskan jawaban Anda/i)
      .fill(
        "Konsultasi memenuhi prosedur formal, tetapi partisipasi belum bermakna karena kehadiran warga sangat rendah.",
      );
    await page.locator('[data-slot="submit-attempt"]').click();

    await expect(page.locator('[data-slot="ai-feedback-panel"]')).toBeVisible();
    await expect(page.getByText("Batas peran AI")).toBeVisible();
  });

  test("hanya fungsi AI yang diizinkan dosen yang ditawarkan", async ({
    page,
  }) => {
    await openStage(page);

    await expect(
      page.locator('[data-slot="ai-request-guiding_questions"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-slot="ai-request-counter_argument"]'),
    ).toHaveCount(0);
  });

  test("umpan balik AI tersimpan dan menandai kutipan tak terlacak", async ({
    page,
  }) => {
    await openStage(page);

    await page.locator('[data-slot="ai-request-guiding_questions"]').click();

    const panel = page.locator('[data-slot="ai-feedback-panel"]');
    await expect(
      panel.getByText("Bukti apa yang menopang klaim Anda?"),
    ).toBeVisible();

    // Kutipan di luar source pack wajib terlihat sebagai tidak terlacak.
    await expect(
      panel.getByText(/Kutipan tidak dapat ditelusuri/i).first(),
    ).toBeVisible();
  });

  test("mahasiswa dapat menandai sikap atas saran AI", async ({ page }) => {
    await openStage(page);

    const panel = page.locator('[data-slot="ai-feedback-panel"]');
    await expect(panel.getByText("Belum ditanggapi").first()).toBeVisible();

    await panel
      .getByRole("button", { name: /^Terima$/ })
      .first()
      .click();
    await expect(panel.getByText("Diterima").first()).toBeVisible();
  });

  test("mahasiswa dapat melaporkan saran AI yang bermasalah", async ({
    page,
  }) => {
    await openStage(page);

    const panel = page.locator('[data-slot="ai-feedback-panel"]');
    await panel
      .getByRole("button", { name: /^Laporkan$/ })
      .last()
      .click();
    await panel
      .getByLabel(/Apa yang bermasalah dari saran ini/i)
      .fill("Kutipannya tidak ada pada sumber yang dilampirkan dosen.");
    await panel.getByRole("button", { name: /Kirim laporan/i }).click();

    await expect(panel.getByText("Dilaporkan").first()).toBeVisible();
  });

  test("mahasiswa menyatakan penggunaan AI", async ({ page }) => {
    await openStage(page);

    const disclosure = page.locator('[data-slot="ai-disclosure"]');
    await disclosure
      .getByLabel(/Pernyataan Anda/i)
      .fill(
        "Saya memakai pertanyaan penuntun untuk memeriksa ulang bukti, lalu menolak satu saran karena kutipannya tidak terlacak.",
      );
    await disclosure.locator('[data-slot="submit-disclosure"]').click();

    await expect(disclosure.getByText("Sudah dinyatakan")).toBeVisible();
  });
});
