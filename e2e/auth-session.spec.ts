/** @format */

import { expect, test } from "@playwright/test";

// Berjalan dengan sesi mahasiswa (project "student").

test.describe("Sesi mahasiswa", () => {
  test("sesi bertahan setelah halaman dimuat ulang", async ({ page }) => {
    await page.goto("/app/student/dashboard");
    await page.reload();

    await expect(page).toHaveURL(/\/app\/student\/dashboard$/);
    await expect(page.getByRole("button", { name: /Keluar/ })).toBeVisible();
  });

  test("titik masuk /app mengarahkan sesuai peran dari sesi", async ({
    page,
  }) => {
    await page.goto("/app");

    await expect(page).toHaveURL(/\/app\/student\/dashboard$/);
  });

  test("mahasiswa ditolak saat membuka area dosen", async ({ page }) => {
    await page.goto("/app/lecturer/dashboard");

    await expect(page).toHaveURL(/\/app\/forbidden$/);
    await expect(page.getByText("Akses ditolak")).toBeVisible();
  });

  test("halaman masuk mengalihkan pengguna yang sudah masuk", async ({
    page,
  }) => {
    await page.goto("/login");

    await expect(page).toHaveURL(/\/app\/student\/dashboard$/);
  });
});
