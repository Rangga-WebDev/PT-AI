/** @format */

import { expect, test, type Page } from "@playwright/test";

import {
  createDisposableUnit,
  findBaselineAttemptId,
} from "./fixtures/learning-content";

// Berjalan dengan sesi mahasiswa (project "student"). Langkah penilaian memakai
// konteks browser terpisah bersesi dosen, karena pembukaan tahap hanya dapat
// dibuktikan dengan melibatkan kedua peran sekaligus.

const LECTURER_STATE = "playwright/.auth/lecturer.json";

test.describe("Ketuntasan dan pembukaan tahap (LOCK-PED-008, LOCK-PED-010)", () => {
  test.describe.configure({ mode: "serial" });

  let unitId: string;
  let activityId: string;
  let attemptId: string;

  test.beforeAll(async () => {
    const fixture = await createDisposableUnit();
    unitId = fixture.unitId;
    activityId = fixture.activityId;
  });

  const stageUrl = (key: string) => `/app/student/learn/${unitId}/stage/${key}`;

  async function openStage(page: Page, key: string, heading: string) {
    await page.goto(stageUrl(key));
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  }

  test("tahap kedua terkunci sebelum tahap pertama dinilai", async ({
    page,
  }) => {
    await page.goto(stageUrl("analysis"));

    await expect(page.getByText(/Tahap Analisis terkunci/i)).toBeVisible();
    await expect(
      page.getByText(/Selesaikan tahap sebelumnya terlebih dahulu/i),
    ).toBeVisible();
  });

  test("mahasiswa mengirim respons awal pada tahap pertama", async ({
    page,
  }) => {
    await openStage(page, "interpretation", "1. Interpretasi");

    await page
      .getByLabel(/Tuliskan jawaban Anda/i)
      .fill(
        "Prosedur formal terpenuhi, tetapi partisipasi belum bermakna karena kehadiran warga sangat rendah dan masukan tertulis tidak ditanggapi.",
      );
    await expect(page.locator('[data-slot="submit-attempt"]')).toBeEnabled();
    await page.locator('[data-slot="submit-attempt"]').click();

    await expect(page.getByLabel(/Tuliskan jawaban Anda/i)).toHaveCount(0);
    await expect(
      page.locator('[data-slot="mastery-status"]').getByText("Belum dinilai"),
    ).toBeVisible();

    attemptId = await findBaselineAttemptId(activityId);
  });

  test("tahap kedua tetap terkunci meskipun respons awal sudah dikirim", async ({
    page,
  }) => {
    await page.goto(stageUrl("analysis"));

    await expect(page.getByText(/Tahap Analisis terkunci/i)).toBeVisible();
  });

  test("dosen menilai respons dan menetapkan ketuntasan", async ({
    browser,
  }) => {
    const context = await browser.newContext({ storageState: LECTURER_STATE });
    const page = await context.newPage();

    try {
      await page.goto(`/app/lecturer/review/${attemptId}`);
      await expect(
        page.getByRole("heading", { name: "Penilaian rubrik" }),
      ).toBeVisible();

      await page.getByLabel("Hasil ketuntasan").selectOption("met");
      await page
        .getByLabel(/Catatan untuk mahasiswa/i)
        .fill(
          "Klaim sudah dibedakan dari fakta dan keterbatasan bukti dinyatakan secara terbuka.",
        );
      await page.locator('[data-slot="submit-assessment"]').click();

      await expect(
        page.getByRole("heading", { name: "Keputusan ketuntasan terakhir" }),
      ).toBeVisible();
    } finally {
      await context.close();
    }
  });

  test("tahap kedua terbuka setelah dosen menilai tuntas", async ({ page }) => {
    await page.goto(stageUrl("analysis"));

    await expect(page.getByText(/Tahap Analisis terkunci/i)).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "2. Analisis" }),
    ).toBeVisible();
  });

  test("mahasiswa melihat hasil ketuntasan pada halaman progres", async ({
    page,
  }) => {
    await page.goto("/app/student/progress");

    await expect(
      page.getByRole("heading", { name: "Hasil ketuntasan" }),
    ).toBeVisible();
    await expect(page.getByText("Memenuhi").first()).toBeVisible();
  });

  test("keputusan jalur belajar beralasan dapat dibaca mahasiswa", async ({
    browser,
    page,
  }) => {
    const context = await browser.newContext({ storageState: LECTURER_STATE });
    const lecturerPage = await context.newPage();

    const reason =
      "Penalaran sudah memadai sehingga dilanjutkan ke tahap analisis tanpa remedial.";

    try {
      await lecturerPage.goto(`/app/lecturer/review/${attemptId}`);

      await lecturerPage.getByLabel("Tindakan").selectOption("continue");
      await lecturerPage.getByLabel(/Alasan keputusan/i).fill(reason);
      await lecturerPage.locator('[data-slot="submit-branching"]').click();
      await expect(
        lecturerPage.locator('[data-slot="submit-branching"]'),
      ).toBeEnabled();
    } finally {
      await context.close();
    }

    await page.goto("/app/student/progress");
    await expect(
      page.locator('[data-slot="branching-decision-item"]').first(),
    ).toContainText(reason);
  });
});
