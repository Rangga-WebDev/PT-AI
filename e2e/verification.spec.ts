/** @format */

import { expect, test, type Page } from "@playwright/test";

import { createDisposableUnit } from "./fixtures/learning-content";

// Berjalan dengan sesi mahasiswa (project "student").
// source_verifications append-only, jadi tiap eksekusi memakai sumber baru.

test.describe("Verifikasi sumber (LOCK-PED-007)", () => {
  test.describe.configure({ mode: "serial" });

  let sourceUrl: string;
  let stageUrl: string;

  test.beforeAll(async () => {
    const fixture = await createDisposableUnit();
    sourceUrl = `/app/student/sources/${fixture.sourceId}?activity=${fixture.activityId}`;
    stageUrl = `/app/student/learn/${fixture.unitId}/stage/interpretation`;
  });

  async function openSource(page: Page) {
    await page.goto(sourceUrl);
    await expect(
      page.locator('[data-slot="verification-checklist"]'),
    ).toBeVisible();
  }

  test("sumber kasus tampil pada ruang belajar dan dapat dibuka", async ({
    page,
  }) => {
    await page.goto(stageUrl);

    await expect(
      page.getByRole("heading", { name: "Sumber terkurasi" }),
    ).toBeVisible();
    await expect(page.getByText("Belum diverifikasi").first()).toBeVisible();

    await page
      .getByRole("link", { name: /Periksa sumber/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/app\/student\/sources\/.+activity=/);
  });

  test("checklist menampilkan enam kriteria dan mengunci penyimpanan", async ({
    page,
  }) => {
    await openSource(page);

    await expect(page.getByRole("checkbox")).toHaveCount(6);
    await expect(
      page.locator('[data-slot="submit-verification"]'),
    ).toBeDisabled();
  });

  test("penyimpanan tetap terkunci ketika alasan terlalu pendek", async ({
    page,
  }) => {
    await openSource(page);

    for (const box of await page.getByRole("checkbox").all()) {
      await box.click();
    }
    await page.getByLabel(/Alasan penilaian/i).fill("pendek");

    await expect(
      page.locator('[data-slot="submit-verification"]'),
    ).toBeDisabled();
  });

  test("verifikasi tersimpan dan ditampilkan sebagai penilaian terakhir", async ({
    page,
  }) => {
    await openSource(page);

    for (const box of await page.getByRole("checkbox").all()) {
      await box.click();
    }
    await page
      .getByLabel(/Alasan penilaian/i)
      .fill("Metodologi tidak dijelaskan sehingga kecukupan bukti diragukan.");

    await page.locator('[data-slot="submit-verification"]').click();

    await expect(
      page.getByRole("heading", { name: "Penilaian terakhir Anda" }),
    ).toBeVisible();
    await expect(page.getByText(/1 penilaian tersimpan/i)).toBeVisible();
  });

  test("klaim kasus dapat ditautkan ke sumber lalu dicabut", async ({
    page,
  }) => {
    await openSource(page);

    const linker = page.locator('[data-slot="claim-linker"]');
    await expect(linker.getByText(/Belum ada bukti tertaut/i)).toBeVisible();

    await linker.getByLabel(/Jenis tautan/i).selectOption("refutes");
    await linker.getByRole("button", { name: /Tautkan ke/i }).click();

    await expect(linker.getByText(/Membantah —/i)).toBeVisible();

    await linker.getByRole("button", { name: /Cabut tautan/i }).click();
    await expect(linker.getByText(/Belum ada bukti tertaut/i)).toBeVisible();
  });

  test("sumber ditandai sudah diverifikasi pada ruang belajar", async ({
    page,
  }) => {
    await page.goto(stageUrl);

    await expect(
      page.getByText(/Sudah Anda verifikasi/i).first(),
    ).toBeVisible();
  });
});
