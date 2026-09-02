/** @format */

import { expect, test, type Page } from "@playwright/test";

import { createDisposableUnit } from "./fixtures/learning-content";

// Berjalan dengan sesi mahasiswa (project "student").
// Baseline tidak dapat dihapus, jadi setiap eksekusi memakai unit sekali pakai.

test.describe("Respons awal mahasiswa (LOCK-PED-004)", () => {
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

  test("tombol kirim terkunci sampai panjang minimum terpenuhi", async ({
    page,
  }) => {
    await openStage(page);

    await page.getByLabel(/Tuliskan jawaban Anda/i).fill("pendek");
    await expect(page.locator('[data-slot="submit-attempt"]')).toBeDisabled();

    await page
      .getByLabel(/Tuliskan jawaban Anda/i)
      .fill("Partisipasi belum bermakna karena bukti kehadiran tipis.");
    await expect(page.locator('[data-slot="submit-attempt"]')).toBeEnabled();
  });

  test("draf tersimpan otomatis dan pulih setelah halaman dimuat ulang", async ({
    page,
  }) => {
    await openStage(page);

    const draft = `Draf otomatis ${Date.now()}`;
    await page.getByLabel(/Tuliskan jawaban Anda/i).fill(draft);

    await expect(page.locator('[data-slot="autosave-status"]')).toContainText(
      /Draf tersimpan/i,
    );

    await page.reload();
    await expect(page.getByLabel(/Tuliskan jawaban Anda/i)).toHaveValue(draft);
  });

  test("umpan balik AI terkunci sebelum respons awal terkirim", async ({
    page,
  }) => {
    await openStage(page);

    await expect(page.locator('[data-slot="ai-locked"]')).toBeVisible();
    await expect(page.locator('[data-slot="ai-feedback-panel"]')).toHaveCount(
      0,
    );
  });

  test("respons awal terkirim, mengunci editor dan membuka umpan balik AI", async ({
    page,
  }) => {
    await openStage(page);

    await page
      .getByLabel(/Tuliskan jawaban Anda/i)
      .fill(
        "Konsultasi memenuhi prosedur formal, tetapi partisipasi belum bermakna karena kehadiran 24 dari 12.000 warga tidak representatif.",
      );
    await page.locator('[data-slot="submit-attempt"]').click();

    await expect(page.getByText(/tidak dapat diubah/i)).toBeVisible();
    await expect(page.locator('[data-slot="ai-feedback-panel"]')).toBeVisible();
    await expect(page.locator('[data-slot="ai-locked"]')).toHaveCount(0);
    await expect(page.getByLabel(/Tuliskan jawaban Anda/i)).toHaveCount(0);
  });

  test("baseline tetap terkunci setelah halaman dibuka ulang", async ({
    page,
  }) => {
    await openStage(page);

    await expect(page.getByText(/tidak dapat diubah/i)).toBeVisible();
    await expect(page.getByLabel(/Tuliskan jawaban Anda/i)).toHaveCount(0);
  });

  test("respons yang terkirim muncul pada halaman progres", async ({
    page,
  }) => {
    await page.goto("/app/student/progress");

    await expect(
      page.getByRole("heading", { name: "Respons yang sudah Anda kirim" }),
    ).toBeVisible();
    await expect(page.getByText("Aktivitas Uji Attempt").first()).toBeVisible();
  });
});
