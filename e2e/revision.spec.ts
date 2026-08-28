/** @format */

import { expect, test, type Page } from "@playwright/test";

import {
  createDisposableUnit,
  findBaselineAttemptId,
} from "./fixtures/learning-content";

const LECTURER_STATE = "playwright/.auth/lecturer.json";

test.describe("Revisi dan refleksi (LOCK-PED-004, LOCK-PED-011)", () => {
  test.describe.configure({ mode: "serial" });

  let unitId: string;
  let activityId: string;
  let attemptId: string;

  const BASELINE =
    "Konsultasi publik memenuhi prosedur formal, tetapi partisipasi warga belum bermakna.";
  const REVISION =
    "Konsultasi publik memenuhi prosedur formal, tetapi partisipasi warga belum bermakna karena hanya 24 dari 12.000 warga hadir.";

  test.beforeAll(async () => {
    const fixture = await createDisposableUnit();
    unitId = fixture.unitId;
    activityId = fixture.activityId;
  });

  async function openStage(page: Page) {
    await page.goto(`/app/student/learn/${unitId}/stage/interpretation`);
    await expect(
      page.getByRole("heading", { name: "1. Interpretasi" }),
    ).toBeVisible();
  }

  test("formulir revisi terkunci sebelum respons awal tersimpan", async ({
    page,
  }) => {
    await openStage(page);

    await expect(page.locator('[data-slot="revision-form"]')).toHaveCount(0);
    await expect(page.locator('[data-slot="reflection-form"]')).toHaveCount(0);
  });

  test("respons awal terkirim lalu formulir revisi terbuka", async ({
    page,
  }) => {
    await openStage(page);

    await page.getByLabel(/Tuliskan jawaban Anda/i).fill(BASELINE);
    await expect(page.locator('[data-slot="submit-attempt"]')).toBeEnabled();
    await page.locator('[data-slot="submit-attempt"]').click();

    await expect(page.getByLabel(/Tuliskan jawaban Anda/i)).toHaveCount(0);
    await expect(page.locator('[data-slot="revision-form"]')).toBeVisible();

    attemptId = await findBaselineAttemptId(activityId);
  });

  test("revisi tanpa alasan yang memadai tidak dapat dikirim", async ({
    page,
  }) => {
    await openStage(page);

    await page.getByLabel("Tulis revisi Anda").fill(REVISION);
    await page.getByLabel("Jelaskan alasannya").fill("pendek");

    await expect(page.locator('[data-slot="submit-revision"]')).toBeDisabled();
  });

  test("sikap terhadap saran AI harus menunjuk sarannya", async ({ page }) => {
    await openStage(page);

    await page.getByLabel("Tulis revisi Anda").fill(REVISION);
    await page
      .getByLabel("Jelaskan alasannya")
      .fill("Saya menerima pertanyaan pemandu tentang keterwakilan warga.");
    await page
      .getByLabel("Alasan revisi")
      .selectOption("ai_suggestion_accepted");

    await expect(page.locator('[data-slot="submit-revision"]')).toBeDisabled();
  });

  test("revisi tersimpan sebagai versi baru dan respons awal tetap utuh", async ({
    page,
  }) => {
    await openStage(page);

    await page.getByLabel("Tulis revisi Anda").fill(REVISION);
    await page.getByLabel("Alasan revisi").selectOption("new_evidence");
    await page
      .getByLabel("Jelaskan alasannya")
      .fill("Menambahkan angka kehadiran warga dari notulen resmi.");
    await page.locator('[data-slot="submit-revision"]').click();

    const history = page.locator('[data-slot="revision-history"]');
    await expect(history).toBeVisible();
    await expect(
      history.locator('[data-slot="revision-baseline"]'),
    ).toContainText(BASELINE);
    await expect(history.locator('[data-slot="revision-item"]')).toHaveCount(1);
    await expect(
      history.locator('[data-slot="revision-reason"]').first(),
    ).toContainText("notulen resmi");

    // Kata yang ditambahkan ditandai sebagai sisipan, bukan sekadar teks baru.
    await expect(history.locator('[data-op="insert"]').first()).toContainText(
      /24|12\.000|hadir/,
    );
  });

  test("refleksi sembilan unsur tersimpan dan menjadi permanen", async ({
    page,
  }) => {
    await openStage(page);

    const form = page.locator('[data-slot="reflection-form"]');
    await expect(form).toBeVisible();

    for (const field of await form.getByRole("textbox").all()) {
      await field.fill("Isian refleksi yang cukup panjang untuk divalidasi.");
    }

    await page.locator('[data-slot="submit-reflection"]').click();

    await expect(page.locator('[data-slot="reflection-saved"]')).toBeVisible();
    await expect(page.locator('[data-slot="reflection-form"]')).toHaveCount(0);
  });

  test("dosen membaca revisi dan refleksi lalu memberi umpan balik", async ({
    browser,
  }) => {
    const context = await browser.newContext({ storageState: LECTURER_STATE });
    const page = await context.newPage();

    try {
      await page.goto(`/app/lecturer/review/${attemptId}`);

      await expect(
        page.locator('[data-slot="revision-history"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-slot="reflection-review"]'),
      ).toBeVisible();

      await page
        .getByLabel("Umpan balik untuk revisi 1")
        .fill("Bukti kehadiran sudah dipakai untuk membatasi klaim Anda.");
      await page.locator('[data-slot="submit-feedback"]').click();

      await expect(
        page.locator('[data-slot="lecturer-feedback-item"]').first(),
      ).toContainText("membatasi klaim");
    } finally {
      await context.close();
    }
  });
});
