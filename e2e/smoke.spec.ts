/** @format */

import { expect, test } from "@playwright/test";

test.describe("Smoke", () => {
  test("halaman beranda tampil dengan judul aplikasi", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/PT-AI LMS/);
    await expect(
      page.getByRole("heading", { name: /PT-AI Learning Management System/i }),
    ).toBeVisible();
  });

  test("halaman yang tidak ada menampilkan pesan 404 Bahasa Indonesia", async ({
    page,
  }) => {
    await page.goto("/halaman-tidak-ada");

    await expect(
      page.getByRole("heading", { name: /Halaman tidak ditemukan/i }),
    ).toBeVisible();
  });
});
