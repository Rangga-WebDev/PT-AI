/** @format */

import { expect, test } from "@playwright/test";

// Berjalan dengan sesi mahasiswa (project "student").

test.describe("Ruang belajar mahasiswa", () => {
  test("dashboard menampilkan penanda MOCK dan enam dimensi", async ({
    page,
  }) => {
    await page.goto("/app/student/dashboard");

    await expect(page.getByText("Data contoh (MOCK)").first()).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Enam dimensi berpikir kritis/i }),
    ).toBeVisible();
  });

  test("ruang belajar mengunci AI sebelum respons awal disimpan", async ({
    page,
  }) => {
    await page.goto("/app/student/learn/unit-konsultasi-publik");

    await expect(page).toHaveURL(/\/stage\/evaluasi$/);
    await expect(page.getByText("Bantuan AI terkunci")).toBeVisible();
    await expect(page.locator('[data-slot="ai-feedback-panel"]')).toHaveCount(
      0,
    );

    await page
      .getByLabel(/Tuliskan jawaban Anda/i)
      .fill("Partisipasi belum bermakna karena bukti kehadiran tidak memadai.");
    await page.getByRole("button", { name: /Simpan respons awal/i }).click();

    await expect(page.locator('[data-slot="ai-feedback-panel"]')).toBeVisible();
    await expect(page.getByText("Batas peran AI")).toBeVisible();
  });

  test("halaman sumber menampilkan checklist verifikasi enam kriteria", async ({
    page,
  }) => {
    await page.goto("/app/student/sources/sumber-berita-daring");

    await expect(
      page.getByRole("heading", { name: "Checklist verifikasi" }),
    ).toBeVisible();
    await expect(page.getByRole("checkbox")).toHaveCount(6);
  });
});

test.describe("Ruang belajar — mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("stepper tahap dan navigasi bawah tampil di layar kecil", async ({
    page,
  }) => {
    await page.goto("/app/student/learn/unit-konsultasi-publik/stage/evaluasi");

    await expect(page.locator('[data-slot="phase-stepper"]')).toBeVisible();
    await expect(page.locator('[data-slot="phase-rail"]')).toBeHidden();
    await expect(
      page.getByRole("navigation", { name: "Navigasi bawah" }),
    ).toBeVisible();
  });
});
