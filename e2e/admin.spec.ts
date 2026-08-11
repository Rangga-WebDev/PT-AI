/** @format */

import { expect, test } from "@playwright/test";

// Berjalan dengan sesi administrator (project "admin").

test.describe("Administrasi akademik", () => {
  test("dashboard admin menampilkan ringkasan struktur", async ({ page }) => {
    await page.goto("/app/admin/dashboard");

    await expect(
      page.getByRole("heading", { name: "Ringkasan struktur akademik" }),
    ).toBeVisible();
    await expect(page.getByText("Periode akademik aktif")).toBeVisible();
  });

  test("halaman pengguna menampilkan daftar dan formulir pembuatan akun", async ({
    page,
  }) => {
    await page.goto("/app/admin/users");

    await expect(
      page.getByRole("heading", { name: "Buat akun baru" }),
    ).toBeVisible();
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.getByText("DEV-MHS-001")).toBeVisible();
  });

  test("kelas hasil seed tampil dan dapat dikelola", async ({ page }) => {
    await page.goto("/app/admin/classes");

    await expect(page.getByText("Pendidikan Kewarganegaraan A")).toBeVisible();
    await page.getByRole("link", { name: "Kelola" }).first().click();

    await expect(
      page.getByRole("heading", { name: "Status publikasi" }),
    ).toBeVisible();
    await expect(page.getByText("Dosen Pengembangan")).toBeVisible();
    await expect(page.getByText("Mahasiswa Pengembangan")).toBeVisible();
  });

  test("kode kelas duplikat ditolak dengan pesan yang jelas", async ({
    page,
  }) => {
    await page.goto("/app/admin/classes");

    await page.getByLabel("Nama kelas").fill("Duplikat");
    await page.getByLabel("Kode kelas").fill("A");
    await page.getByRole("button", { name: "Buat kelas" }).click();

    await expect(
      page.getByText(
        "Kode tersebut sudah dipakai. Gunakan kode lain yang unik.",
      ),
    ).toBeVisible();
  });

  test("periode akademik dengan tanggal terbalik ditolak", async ({ page }) => {
    await page.goto("/app/admin/academic-periods");

    await page.getByLabel("Nama periode").fill("Periode Salah");
    await page.getByLabel("Kode").fill("SALAH-1");
    await page.getByLabel("Tanggal mulai").fill("2027-01-01");
    await page.getByLabel("Tanggal selesai").fill("2026-01-01");
    await page.getByRole("button", { name: "Tambah periode" }).click();

    await expect(
      page.getByText("Tanggal selesai harus setelah tanggal mulai."),
    ).toBeVisible();
  });
});
