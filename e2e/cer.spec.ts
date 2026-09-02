/** @format */

import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { createDisposableUnit } from "./fixtures/learning-content";

// Berjalan dengan sesi mahasiswa (project "student").
// Aktivitas berbentuk CER menuntut klaim, bukti, dan penalaran sebagai kolom
// terpisah; yang tersimpan tetap satu narasi utuh beserta unsurnya.

const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
const serviceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];

function admin() {
  if (!url || !serviceRoleKey) {
    throw new Error("Kredensial Supabase dibutuhkan untuk pengujian CER.");
  }
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const CLAIM =
  "Konsultasi publik itu belum bermakna bagi warga terdampak kebijakan.";
const EVIDENCE =
  "Notulen resmi mencatat hanya sebelas warga hadir dari empat ratus undangan.";
const REASONING =
  "Kehadiran setipis itu membuat forum tidak dapat mewakili warga terdampak.";

test.describe("Respons awal berbentuk CER", () => {
  test.describe.configure({ mode: "serial" });

  let stageUrl: string;
  let activityId: string;

  test.beforeAll(async () => {
    const unit = await createDisposableUnit({ responseSchema: "cer" });
    stageUrl = `/app/student/learn/${unit.unitId}/stage/interpretation`;
    activityId = unit.activityId;
  });

  test("meminta unsur argumen terpisah, bukan satu kotak teks", async ({
    page,
  }) => {
    await page.goto(stageUrl);

    await expect(page.locator('[data-slot="cer-attempt-form"]')).toBeVisible();
    await expect(page.getByLabel("Klaim")).toBeVisible();
    await expect(page.getByLabel("Bukti")).toBeVisible();
    await expect(page.getByLabel("Penalaran")).toBeVisible();
    await expect(page.getByLabel(/Tuliskan jawaban Anda/i)).toHaveCount(0);
  });

  test("menahan pengiriman sampai tiga unsur wajib terisi", async ({
    page,
  }) => {
    await page.goto(stageUrl);

    await expect(page.locator('[data-slot="submit-cer"]')).toBeDisabled();

    await page.getByLabel("Klaim").fill(CLAIM);
    await page.getByLabel("Bukti").fill(EVIDENCE);
    await expect(page.locator('[data-slot="submit-cer"]')).toBeDisabled();

    await page.getByLabel("Penalaran").fill(REASONING);
    await expect(page.locator('[data-slot="submit-cer"]')).toBeEnabled();
  });

  test("menyimpan unsur argumen beserta narasi gabungannya", async ({
    page,
  }) => {
    await page.goto(stageUrl);

    await page.getByLabel("Klaim").fill(CLAIM);
    await page.getByLabel("Bukti").fill(EVIDENCE);
    await page.getByLabel("Penalaran").fill(REASONING);
    await page.locator('[data-slot="submit-cer"]').click();

    await expect(page.getByText("Baseline tersimpan")).toBeVisible();

    const supabase = admin();

    const { data: attempt } = await supabase
      .from("attempts")
      .select("id, content, is_baseline")
      .eq("activity_id", activityId)
      .eq("is_baseline", true)
      .maybeSingle();

    expect(attempt?.content).toContain(CLAIM);
    expect(attempt?.content).toContain(EVIDENCE);
    expect(attempt?.content).toContain(REASONING);

    const { data: elements } = await supabase
      .from("attempt_answers")
      .select("question_key, content")
      .eq("attempt_id", attempt?.id ?? "")
      .order("sequence");

    const byElement = new Map(
      (elements ?? []).map((row) => [row.question_key, row.content]),
    );

    expect(byElement.get("claim")).toBe(CLAIM);
    expect(byElement.get("evidence")).toBe(EVIDENCE);
    expect(byElement.get("reasoning")).toBe(REASONING);
  });

  test("mengunci editor setelah respons awal tersimpan", async ({ page }) => {
    await page.goto(stageUrl);

    await expect(page.locator('[data-slot="cer-attempt-form"]')).toHaveCount(0);
    await expect(page.getByText("Baseline tersimpan")).toBeVisible();
  });
});
