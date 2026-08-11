/** @format */

import { expect, test } from "@playwright/test";

import { STUDENT_EMAIL, STUDENT_PASSWORD } from "./helpers/auth";

// Berjalan tanpa sesi (project "guest").

test.describe("Autentikasi — tamu", () => {
  test("halaman terproteksi mengalihkan tamu ke halaman masuk", async ({
    page,
  }) => {
    await page.goto("/app/student/dashboard");

    await expect(page).toHaveURL(/\/login\?redirectTo=/);
    await expect(
      page.getByRole("heading", { name: "Masuk ke akun Anda" }),
    ).toBeVisible();
  });

  test("area dosen juga tertutup bagi tamu", async ({ page }) => {
    await page.goto("/app/lecturer/dashboard");

    await expect(page).toHaveURL(/\/login\?redirectTo=/);
  });

  test("surel dengan format salah ditolak validasi server", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Surel institusi").fill("bukan-surel");
    await page.getByLabel("Kata sandi").fill("apa-saja");
    await page.getByRole("button", { name: "Masuk" }).click();

    await expect(page.getByText("Format surel tidak valid.")).toBeVisible();
  });

  test("kredensial salah menampilkan pesan generik", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Surel institusi").fill("tidak.ada@ptai.test");
    await page.getByLabel("Kata sandi").fill("kata-sandi-yang-salah");
    await page.getByRole("button", { name: "Masuk" }).click();

    // Pesan tidak boleh membedakan surel tidak terdaftar dan sandi salah.
    await expect(
      page.getByText("Surel atau kata sandi salah.", { exact: true }),
    ).toBeVisible();
  });

  test("permintaan atur ulang tidak membocorkan surel terdaftar", async ({
    page,
  }) => {
    await page.goto("/forgot-password");
    await page.getByLabel("Surel institusi").fill("tidak.ada@ptai.test");
    await page.getByRole("button", { name: "Kirim tautan" }).click();

    await expect(page.getByRole("status")).toContainText(
      "Jika surel tersebut terdaftar",
    );
  });
});

// Memakai sesi sendiri, bukan storageState bersama, karena keluar mencabut
// token yang akan dipakai test lain.
test.describe("Keluar dari akun", () => {
  test.skip(
    !STUDENT_EMAIL || !STUDENT_PASSWORD,
    "Kredensial mahasiswa belum tersedia (jalankan npm run db:seed:users)",
  );

  test("keluar memblokir kembali ke halaman terproteksi", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Surel institusi").fill(STUDENT_EMAIL!);
    await page.getByLabel("Kata sandi").fill(STUDENT_PASSWORD!);
    await page.getByRole("button", { name: "Masuk" }).click();
    await page.waitForURL(/\/app\/student\/dashboard$/);

    await page.getByRole("button", { name: /Keluar/ }).click();
    await page.waitForURL(/\/login$/);

    await page.goto("/app/student/dashboard");
    await expect(page).toHaveURL(/\/login\?redirectTo=/);
  });
});
