/** @format */

import { test as setup, expect } from "@playwright/test";

import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  ADMIN_STATE,
  LECTURER_EMAIL,
  LECTURER_PASSWORD,
  STUDENT_EMAIL,
  STUDENT_PASSWORD,
  STUDENT_STATE,
  LECTURER_STATE,
} from "./helpers/auth";

// Login dilakukan sekali di sini lalu sesinya dipakai ulang seluruh test,
// agar tidak menembus rate limit Supabase Auth saat test berjalan paralel.
// Berurutan (serial) karena beberapa login serentak pun dapat kena rate limit.
setup.describe.configure({ mode: "serial" });

setup("authenticate student", async ({ page }) => {
  setup.skip(
    !STUDENT_EMAIL || !STUDENT_PASSWORD,
    "Kredensial mahasiswa belum ada",
  );

  await page.goto("/login");
  await page.getByLabel("Surel institusi").fill(STUDENT_EMAIL!);
  await page.getByLabel("Kata sandi").fill(STUDENT_PASSWORD!);
  await page.getByRole("button", { name: "Masuk" }).click();

  await page.waitForURL(/\/app\/student\/dashboard$/);
  await expect(page.getByRole("button", { name: /Keluar/ })).toBeVisible();

  await page.context().storageState({ path: STUDENT_STATE });
});

setup("authenticate lecturer", async ({ page }) => {
  setup.skip(
    !LECTURER_EMAIL || !LECTURER_PASSWORD,
    "Kredensial dosen belum ada",
  );

  await page.goto("/login");
  await page.getByLabel("Surel institusi").fill(LECTURER_EMAIL!);
  await page.getByLabel("Kata sandi").fill(LECTURER_PASSWORD!);
  await page.getByRole("button", { name: "Masuk" }).click();

  await page.waitForURL(/\/app\/lecturer\/dashboard$/);

  await page.context().storageState({ path: LECTURER_STATE });
});

setup("authenticate admin", async ({ page }) => {
  setup.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, "Kredensial admin belum ada");

  await page.goto("/login");
  await page.getByLabel("Surel institusi").fill(ADMIN_EMAIL!);
  await page.getByLabel("Kata sandi").fill(ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Masuk" }).click();

  await page.waitForURL(/\/app\/admin\/dashboard$/);

  await page.context().storageState({ path: ADMIN_STATE });
});
