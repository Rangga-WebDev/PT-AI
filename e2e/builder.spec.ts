/** @format */

import { expect, test } from "@playwright/test";

// Berjalan dengan sesi dosen (project "lecturer").

async function openBuilder(page: import("@playwright/test").Page) {
  await page.goto("/app/lecturer/classes");
  await page
    .getByRole("link", { name: /Buka kelas|Lihat kelas/i })
    .first()
    .click();
  await page.getByRole("link", { name: "PT-AI", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Perancang PT-AI" }),
  ).toBeVisible();
}

test.describe("Perancang PT-AI dosen", () => {
  test("menampilkan struktur pertemuan dan unit kelas", async ({ page }) => {
    await openBuilder(page);

    await expect(
      page.getByRole("link", {
        name: /Partisipasi Warga dalam Konsultasi Publik/i,
      }),
    ).toBeVisible();
  });

  test("unit menampilkan enam tahap terkunci tanpa opsi mengubah urutan", async ({
    page,
  }) => {
    await openBuilder(page);
    await page
      .getByRole("link", { name: /Partisipasi Warga dalam Konsultasi Publik/i })
      .click();

    await expect(
      page.getByRole("heading", { name: "Enam tahap berpikir kritis" }),
    ).toBeVisible();

    for (const label of [
      "Interpretasi",
      "Analisis",
      "Evaluasi",
      "Inferensi",
      "Eksplanasi",
      "Refleksi",
    ]) {
      await expect(
        page.getByText(new RegExp(`Judul tahap \\d · ${label}`)),
      ).toBeVisible();
    }

    // Tidak ada kendali untuk mengubah jenis maupun urutan tahap.
    await expect(page.locator('select[name="stageKey"]')).toHaveCount(0);
    await expect(page.locator('input[name="sequence"]')).toHaveCount(0);
  });

  test("bantuan AI mati secara bawaan pada formulir aktivitas", async ({
    page,
  }) => {
    await openBuilder(page);
    await page
      .getByRole("link", { name: /Partisipasi Warga dalam Konsultasi Publik/i })
      .click();

    await expect(page.locator('input[name="allowsAi"]')).not.toBeChecked();
  });

  test("unit tanpa kasus tidak dapat diterbitkan", async ({ page }) => {
    await openBuilder(page);

    const suffix = Date.now().toString().slice(-6);
    await page.getByLabel("Judul unit").fill(`Unit Uji Terbit ${suffix}`);
    await page
      .getByLabel("Tujuan pembelajaran")
      .fill("Tujuan pembelajaran unit uji untuk memeriksa aturan penerbitan.");
    await page.getByRole("button", { name: "Tambah unit" }).click();

    await expect(
      page.getByText("Unit dibuat beserta enam tahap pembelajaran."),
    ).toBeVisible();

    const row = page
      .getByRole("listitem")
      .filter({ hasText: `Unit Uji Terbit ${suffix}` })
      .last();
    await row.getByRole("button", { name: "Terbitkan unit" }).click();

    await expect(
      page.getByText(/Unit belum memiliki kasus/i).first(),
    ).toBeVisible();
  });

  test("rubrik dapat dibuat dan terikat pada dimensi berpikir kritis", async ({
    page,
  }) => {
    await page.goto("/app/lecturer/rubrics");

    const title = `Rubrik Uji ${Date.now().toString().slice(-6)}`;
    await page.getByLabel("Judul rubrik").fill(title);
    await page.getByRole("button", { name: "Tambah rubrik" }).click();

    await expect(page.getByText("Rubrik berhasil dibuat.")).toBeVisible();

    // Diperiksa pada daftar, bukan pada <option> select yang tidak terlihat.
    await page.reload();
    await expect(
      page.getByRole("listitem").filter({ hasText: title }),
    ).toBeVisible();
  });
});
