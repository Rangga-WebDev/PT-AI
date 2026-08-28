/** @format */

import { expect, test } from "@playwright/test";

// Berjalan dengan sesi dosen (project "lecturer").

test.describe("Kurasi sumber dosen", () => {
  test("menampilkan daftar sumber terkurasi", async ({ page }) => {
    await page.goto("/app/lecturer/sources");

    await expect(
      page.getByRole("heading", { name: "Daftar sumber" }),
    ).toBeVisible();
  });

  test("sumber baru tersimpan dan muncul di daftar", async ({ page }) => {
    await page.goto("/app/lecturer/sources");

    const title = `Sumber Kurasi Uji ${Date.now().toString().slice(-6)}`;
    await page.getByLabel("Judul sumber").fill(title);
    await page.getByRole("button", { name: "Tambah sumber" }).click();

    await expect(page.getByText("Sumber berhasil ditambahkan.")).toBeVisible();

    await page.reload();
    await expect(
      page.getByRole("listitem").filter({ hasText: title }),
    ).toBeVisible();
  });

  test("URL yang tidak valid ditolak dengan pesan Bahasa Indonesia", async ({
    page,
  }) => {
    await page.goto("/app/lecturer/sources");

    await page.getByLabel("Judul sumber").fill("Sumber dengan URL salah");
    await page.getByLabel("URL (opsional)").fill("bukan-url");
    await page.getByRole("button", { name: "Tambah sumber" }).click();

    await expect(page.getByText("URL tidak valid.")).toBeVisible();
  });
});
