/** @format */

import { expect, test, type Browser, type Page } from "@playwright/test";

import {
  attachRubric,
  countAiInteractions,
  countFinalMastery,
  readProvenance,
} from "./fixtures/ai-review";
import {
  createDisposableUnit,
  findBaselineAttemptId,
} from "./fixtures/learning-content";

// Berjalan dengan sesi mahasiswa (project "student"); langkah dosen memakai
// konteks terpisah. Yang dibuktikan di sini adalah janji Gate 4: tidak ada
// usulan AI yang tampil di layar tanpa jejak yang menyertainya di basis data.

const LECTURER_STATE = "playwright/.auth/lecturer.json";

test.describe("Jejak usulan penilaian AI", () => {
  test.describe.configure({ mode: "serial" });

  let unitId: string;
  let activityId: string;
  let attemptId: string;
  let criterionIds: string[];

  test.beforeAll(async () => {
    const fixture = await createDisposableUnit();
    unitId = fixture.unitId;
    activityId = fixture.activityId;
    criterionIds = (await attachRubric(activityId)).criterionIds;
  });

  async function asLecturer(
    browser: Browser,
    run: (page: Page) => Promise<void>,
  ) {
    const context = await browser.newContext({ storageState: LECTURER_STATE });
    const page = await context.newPage();
    try {
      await run(page);
    } finally {
      await context.close();
    }
  }

  test("mahasiswa mengirim respons awal yang akan direview", async ({
    page,
  }) => {
    await page.goto(`/app/student/learn/${unitId}/stage/interpretation`);

    await page
      .getByLabel(/Tuliskan jawaban Anda/i)
      .fill(
        "Klaim kebijakan itu bertumpu pada asumsi bahwa kehadiran warga menandakan persetujuan, padahal notulen tidak memuat tanggapan atas masukan tertulis.",
      );
    await page.locator('[data-slot="submit-attempt"]').click();
    await expect(page.getByLabel(/Tuliskan jawaban Anda/i)).toHaveCount(0);

    attemptId = await findBaselineAttemptId(activityId);
  });

  test("usulan yang tampil selalu meninggalkan jejak lengkap", async ({
    browser,
  }) => {
    await asLecturer(browser, async (page) => {
      await page.goto(`/app/lecturer/review/${attemptId}`);

      await page
        .getByRole("button", { name: "Bantu review dengan AI" })
        .click();

      await expect(
        page.getByRole("heading", { name: "Bantuan penilaian AI" }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Minta ulang" }),
      ).toBeVisible({ timeout: 30_000 });
    });

    const entries = await readProvenance(attemptId);
    expect(entries.length).toBeGreaterThanOrEqual(1);

    const entry = entries[0]!;
    expect(entry.attemptId).toBe(attemptId);
    expect(entry.activityId).toBe(activityId);
    expect(entry.classId).toBeTruthy();
    expect(entry.studentId).toBeTruthy();
    expect(entry.lecturerId).toBeTruthy();
    expect(entry.model).toBeTruthy();
    expect(entry.promptVersion).toBeGreaterThan(0);
    expect(entry.at).toBeTruthy();
    expect(entry.rubricCriteriaIds.sort()).toEqual([...criterionIds].sort());
    expect(Array.isArray(entry.evidenceIds)).toBe(true);
    expect(entry.suggestion.length).toBeGreaterThan(0);
  });

  // Panggilan dosen tidak boleh tercatat sebagai penggunaan AI oleh mahasiswa;
  // kolom itulah yang menjadi variabel penelitian.
  test("usulan tidak menulis ketuntasan maupun penggunaan AI mahasiswa", async () => {
    expect(await countFinalMastery(activityId)).toBe(0);
    expect(await countAiInteractions(attemptId)).toBe(0);
  });

  test("dosen tetap pemegang keputusan akhir", async ({ browser }) => {
    await asLecturer(browser, async (page) => {
      await page.goto(`/app/lecturer/review/${attemptId}`);

      // Rubrik terpasang, sehingga tiap kriteria harus dipilih levelnya
      // sebelum keputusan ketuntasan dapat disimpan.
      for (const criterionId of criterionIds) {
        await page.locator(`#level-${criterionId}-4`).check();
      }

      await page.getByLabel("Hasil ketuntasan").selectOption("met");
      await page
        .getByLabel(/Catatan untuk mahasiswa/i)
        .fill(
          "Asumsi di balik klaim sudah Anda buka; lanjutkan dengan menimbang bukti tandingannya.",
        );
      await page.locator('[data-slot="submit-assessment"]').click();

      await expect(
        page.getByRole("heading", { name: "Keputusan ketuntasan terakhir" }),
      ).toBeVisible();
    });

    expect(await countFinalMastery(activityId)).toBe(1);
  });

  test("pekerjaan di luar kelas dosen tidak dapat diusulkan", async ({
    browser,
  }) => {
    await asLecturer(browser, async (page) => {
      await page.goto(
        "/app/lecturer/review/00000000-0000-4000-8000-000000000000",
      );

      await expect(
        page.getByRole("button", { name: "Bantu review dengan AI" }),
      ).toHaveCount(0);
    });

    expect(
      await readProvenance("00000000-0000-4000-8000-000000000000"),
    ).toHaveLength(0);
  });
});
