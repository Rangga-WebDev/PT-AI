/** @format */

import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
const serviceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];

function admin() {
  if (!url || !serviceRoleKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY dibutuhkan untuk fixture E2E.",
    );
  }
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

test.describe("Instrumen pretest dan posttest", () => {
  test.describe.configure({ mode: "serial" });

  let classId: string;
  let studentId: string;
  const title = `Pretest E2E ${Date.now()}`;

  test.beforeAll(async () => {
    const supabase = admin();

    const { data: student } = await supabase
      .from("profiles")
      .select("id")
      .eq("identifier", "DEV-MHS-001")
      .maybeSingle();

    if (!student) {
      throw new Error(
        "Mahasiswa pengembangan tidak ditemukan; jalankan db:seed:users.",
      );
    }

    const { data: enrollment } = await supabase
      .from("enrollments")
      .select("class_id")
      .eq("student_id", student.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (!enrollment) {
      throw new Error(
        "Kelas seed tidak ditemukan; jalankan db:seed:academics.",
      );
    }

    studentId = student.id;
    classId = enrollment.class_id;
  });

  /**
   * Regresi: daftar mahasiswa sempat mengirim id pendaftaran, bukan id profil,
   * sehingga setiap penyimpanan melanggar foreign key dan hanya memunculkan
   * pesan galat umum.
   */
  test("skor pengukuran tersimpan dengan sumber pretest", async ({ page }) => {
    await page.goto(`/app/lecturer/classes/${classId}/instruments`);

    await page.getByLabel("Judul instrumen").fill(title);
    await page.locator('[data-slot="submit-instrument"]').click();

    const item = page
      .locator('[data-slot="instrument-item"]')
      .filter({ hasText: title });
    await expect(item).toBeVisible();

    await item.getByLabel("Skor").fill("77");
    await item.locator('[data-slot="submit-measurement"]').click();

    // Kolom skor hanya dikosongkan setelah aksi server berhasil.
    await expect(item.getByLabel("Skor")).toHaveValue("");
    await expect(item.getByRole("alert")).toHaveCount(0);

    const supabase = admin();
    const { data } = await supabase
      .from("critical_thinking_scores")
      .select("score, dimension, measurement_source")
      .eq("student_id", studentId)
      .eq("class_id", classId)
      .eq("measurement_source", "pretest")
      .order("measured_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    expect(data?.score).toBe(77);
    expect(data?.dimension).toBe("interpretation");
  });
});
