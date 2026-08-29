/** @format */

import { expect, test } from "@playwright/test";

import { ADMIN_STATE } from "./helpers/auth";

test.describe("Persetujuan dan tata kelola penelitian (SEC-005)", () => {
  test.describe.configure({ mode: "serial" });

  test("lembar persetujuan memuat keterangan yang wajib dibaca", async ({
    page,
  }) => {
    await page.goto("/app/student/consent");

    const info = page.locator('[data-slot="consent-information"]');
    await expect(info).toBeVisible();
    await expect(info).toContainText("Pengaruh terhadap nilai");
    await expect(info).toContainText("Menarik persetujuan");
  });

  test("tombol persetujuan terkunci sebelum keterangan diakui terbaca", async ({
    page,
  }) => {
    await page.goto("/app/student/consent");

    await expect(page.locator('[data-slot="consent-grant"]')).toBeDisabled();
    await page.locator('[data-slot="consent-acknowledge"]').check();
    await expect(page.locator('[data-slot="consent-grant"]')).toBeEnabled();
  });

  test("mahasiswa menyetujui lalu terdaftar sebagai partisipan", async ({
    page,
  }) => {
    await page.goto("/app/student/consent");

    await page.locator('[data-slot="consent-acknowledge"]').check();
    await page.locator('[data-slot="consent-grant"]').click();

    await expect(page.getByText("Bersedia ikut serta")).toBeVisible();
    await expect(page.locator('[data-slot="consent-withdraw"]')).toBeVisible();
  });

  test("penarikan persetujuan menyatakan pemutusan kaitan identitas", async ({
    page,
  }) => {
    await page.goto("/app/student/consent");

    await page.locator('[data-slot="consent-withdraw"]').click();

    await expect(page.getByText("Persetujuan ditarik")).toBeVisible();
    await expect(
      page.locator('[data-slot="consent-form"]').getByRole("status"),
    ).toContainText(/kaitan identitas sudah diputus/i);
  });

  test("ekspor penelitian ditolak untuk mahasiswa", async ({ page }) => {
    const response = await page.request.get(
      "/api/research/export?dataset=ct_scores",
    );

    expect(response.status()).toBe(403);
  });

  test("admin mengunduh ekspor berpseudonim", async ({ browser }) => {
    const context = await browser.newContext({ storageState: ADMIN_STATE });

    try {
      const response = await context.request.get(
        "/api/research/export?dataset=ct_scores",
      );

      expect(response.status()).toBe(200);
      expect(response.headers()["content-type"]).toContain("text/csv");

      const body = await response.text();
      if (body.length > 0) {
        expect(body).toContain("pseudonym");
        expect(body).not.toMatch(/DEV-MHS-001|@ptai\.test/);
      }
    } finally {
      await context.close();
    }
  });

  test("dataset di luar daftar ditolak", async ({ browser }) => {
    const context = await browser.newContext({ storageState: ADMIN_STATE });

    try {
      const response = await context.request.get(
        "/api/research/export?dataset=profiles",
      );

      expect(response.status()).toBe(400);
    } finally {
      await context.close();
    }
  });

  test("halaman retensi tidak menawarkan jejak permanen sebagai domain", async ({
    browser,
  }) => {
    const context = await browser.newContext({ storageState: ADMIN_STATE });
    const page = await context.newPage();

    try {
      await page.goto("/app/admin/retention");

      const form = page.locator('[data-slot="retention-form"]');
      const options = form.getByLabel("Domain data").locator("option");

      await expect(options).toHaveCount(2);
      await expect(options).not.toContainText(["Peristiwa pembelajaran"]);

      // Batasnya dinyatakan terbuka, bukan disembunyikan dari administrator.
      await expect(form.getByRole("status")).toContainText(/jejak permanen/i);
      await expect(form.getByRole("status")).toContainText(
        /memutus pemetaan identitas/i,
      );
    } finally {
      await context.close();
    }
  });

  test("aturan retensi pada domain yang sah tersimpan", async ({ browser }) => {
    const context = await browser.newContext({ storageState: ADMIN_STATE });
    const page = await context.newPage();

    try {
      await page.goto("/app/admin/retention");

      const form = page.locator('[data-slot="retention-form"]');
      await form.getByLabel("Domain data").selectOption("notifications");
      await form.getByLabel("Masa simpan (hari)").fill("90");
      await form.getByLabel("Aksi").selectOption("delete");
      await form.locator('[data-slot="submit-retention"]').click();

      await expect(
        page.locator('[data-slot="retention-rule"]').filter({
          hasText: "Notifikasi",
        }),
      ).toBeVisible();
    } finally {
      await context.close();
    }
  });
});
