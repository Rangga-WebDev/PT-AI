/** @format */

import { expect, test } from "@playwright/test";

test.describe("Pendaftaran mahasiswa tanpa fixture", () => {
  test("tautan daftar tersedia dari halaman masuk", async ({ page }) => {
    await page.goto("/login");
    await page
      .getByRole("link", { name: "Belum punya akun mahasiswa? Daftar" })
      .click();
    await expect(page).toHaveURL(/\/register$/);
    await expect(
      page.getByRole("heading", { name: "Daftar mahasiswa" }),
    ).toBeVisible();
    await expect(page.getByLabel("NIM", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Surel mahasiswa")).toBeVisible();
    await expect(page.getByRole("combobox")).toHaveCount(0);
  });

  test("domain asing ditolak server tanpa membuat akun", async ({ page }) => {
    await page.goto("/register");
    await page.getByLabel("Nama lengkap").fill("Validasi Domain");
    await page.getByLabel("NIM", { exact: true }).fill("001234567890");
    await page.getByLabel("Surel mahasiswa").fill("validasi@example.invalid");
    await page
      .getByLabel("Kata sandi", { exact: true })
      .fill("Validasi-bukan-akun-2026");
    await page
      .getByLabel("Konfirmasi kata sandi")
      .fill("Validasi-bukan-akun-2026");
    await page
      .getByRole("button", { name: "Daftar mahasiswa", exact: true })
      .click();
    await expect(
      page.getByText("Gunakan surel @student.unismuh.ac.id.", { exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel("Surel mahasiswa")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await expect(page).toHaveURL(/\/register$/);
  });

  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    test(`formulir terbaca pada lebar ${viewport.width}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto("/register");
      await expect(page.getByLabel("NIM", { exact: true })).toBeVisible();
      await page
        .getByRole("button", { name: "Daftar mahasiswa", exact: true })
        .scrollIntoViewIfNeeded();
      await expect(
        page.getByRole("button", { name: "Daftar mahasiswa", exact: true }),
      ).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);
    });
  }
});
