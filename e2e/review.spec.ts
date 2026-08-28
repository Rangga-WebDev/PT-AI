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

    // Sejak PHASE 11 "Nilai" adalah tautan ke halaman penilaian, bukan kendali
    // penyuntingan. Respons tetap append-only dan tidak dapat diubah dari sini.
    for (const link of await page.getByRole("link", { name: "Nilai" }).all()) {
      await expect(link).toHaveAttribute(
        "href",
        /^\/app\/lecturer\/review\/[0-9a-f-]{36}$/,
      );
    }
    await expect(page.getByRole("button", { name: /Nilai/i })).toHaveCount(0);
  });
});
