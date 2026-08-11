/** @format */

import { expect, test } from "@playwright/test";

// Berjalan dengan sesi dosen (project "lecturer").

test.describe("Area dosen", () => {
  test("dashboard dosen menampilkan antrean review", async ({ page }) => {
    await page.goto("/app/lecturer/dashboard");

    await expect(
      page.getByRole("heading", { name: "Antrean review terbaru" }),
    ).toBeVisible();
  });

  test("dosen ditolak saat membuka area mahasiswa", async ({ page }) => {
    await page.goto("/app/student/dashboard");

    await expect(page).toHaveURL(/\/app\/forbidden$/);
  });

  test("titik masuk /app mengarahkan dosen ke dashboard dosen", async ({
    page,
  }) => {
    await page.goto("/app");

    await expect(page).toHaveURL(/\/app\/lecturer\/dashboard$/);
  });
});
