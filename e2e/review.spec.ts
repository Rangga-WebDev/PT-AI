/** @format */

import { expect, test } from "@playwright/test";

// Berjalan dengan sesi dosen (project "lecturer").

test.describe("Antrean review dosen", () => {
  test("menampilkan respons awal mahasiswa kelas yang diampu", async ({
    page,
  }) => {
    await page.goto("/app/lecturer/review");

    await expect(
      page.getByRole("heading", { name: "Respons awal masuk" }),
    ).toBeVisible();
  });

  test("tidak menyediakan kendali untuk mengubah respons mahasiswa", async ({
    page,
  }) => {
    await page.goto("/app/lecturer/review");

    await expect(page.getByRole("textbox")).toHaveCount(0);
    for (const button of await page
      .getByRole("button", { name: /Nilai/i })
      .all()) {
      await expect(button).toBeDisabled();
    }
  });
});
