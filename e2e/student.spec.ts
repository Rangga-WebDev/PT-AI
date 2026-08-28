/** @format */

import { expect, test } from "@playwright/test";

// Berjalan dengan sesi mahasiswa (project "student").

test.describe("Ruang belajar mahasiswa", () => {
  test("dashboard menampilkan unit nyata dan enam dimensi", async ({
    page,
  }) => {
    await page.goto("/app/student/dashboard");

    await expect(
      page.getByText("Partisipasi Warga dalam Konsultasi Publik").first(),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Enam dimensi berpikir kritis/i }),
    ).toBeVisible();
  });

  test("unit dari database membuka tahap interpretasi beserta kasus dan aktivitas", async ({
    page,
  }) => {
    await page.goto("/app/student/dashboard");
    await page
      .getByRole("link", { name: /Lanjutkan tahap/i })
      .first()
      .click();

    await expect(page).toHaveURL(/\/stage\/interpretation$/);
    await expect(
      page.getByRole("heading", { name: "1. Interpretasi" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: /Konsultasi Publik Rancangan Peraturan Daerah/i,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Rumuskan masalah kebijakan" }),
    ).toBeVisible();
  });

  test("catatan pedagogis dosen tidak terlihat mahasiswa", async ({ page }) => {
    await page.goto("/app/student/dashboard");
    await page
      .getByRole("link", { name: /Lanjutkan tahap/i })
      .first()
      .click();

    await expect(page.getByText(/Catatan dosen/i)).toHaveCount(0);
    await expect(
      page.getByText(/Bedakan fakta yang dinyatakan dalam kasus/i),
    ).toBeVisible();
  });

  test("tahap lanjutan masih terkunci sampai ketuntasan aktif", async ({
    page,
  }) => {
    await page.goto("/app/student/dashboard");
    await page
      .getByRole("link", { name: /Lanjutkan tahap/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/stage\/interpretation$/);

    const url = new URL(page.url());
    const stagePath = url.pathname.replace(
      "/stage/interpretation",
      "/stage/analysis",
    );
    await page.goto(stagePath);

    // Sejak PHASE 11 alasan penguncian berasal dari `computeStageAccess`, yang
    // menyebutkan syaratnya secara spesifik alih-alih kalimat umum.
    await expect(page.getByText(/Tahap Analisis terkunci/i)).toBeVisible();
    await expect(
      page.getByText(/Selesaikan tahap sebelumnya terlebih dahulu/i),
    ).toBeVisible();
  });

  // Penguncian AI dan pengiriman baseline diuji di attempt.spec.ts memakai unit
  // sekali pakai, karena baseline append-only membuat status di sini berubah
  // permanen setelah satu kali pengiriman.
  // Checklist verifikasi diuji di verification.spec.ts karena membutuhkan
  // konteks aktivitas dan sumber sekali pakai.
});

test.describe("Ruang belajar — mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("stepper tahap dan navigasi bawah tampil di layar kecil", async ({
    page,
  }) => {
    await page.goto("/app/student/dashboard");
    await page
      .getByRole("link", { name: /Lanjutkan tahap/i })
      .first()
      .click();

    await expect(page.locator('[data-slot="phase-stepper"]')).toBeVisible();
    await expect(page.locator('[data-slot="phase-rail"]')).toBeHidden();
    await expect(
      page.getByRole("navigation", { name: "Navigasi bawah" }),
    ).toBeVisible();
  });
});
