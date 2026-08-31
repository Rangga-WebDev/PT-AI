/** @format */

import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

import {
  createDisposableUnit,
  type DisposableUnit,
} from "./fixtures/learning-content";

const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
const serviceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];

const BODY_V1 = "Badan kasus versi pertama yang dibaca mahasiswa.";
const BODY_V2 = "Badan kasus versi kedua yang tidak boleh terlihat.";

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

async function publishVersion(unitId: string, versionNumber: number) {
  const supabase = admin();

  const { data: snapshot, error: snapshotError } = await supabase.rpc(
    "build_unit_snapshot",
    { p_unit_id: unitId },
  );
  if (snapshotError) throw new Error(snapshotError.message);

  const { data: hash, error: hashError } = await supabase.rpc(
    "unit_snapshot_hash",
    { p_snapshot: snapshot },
  );
  if (hashError) throw new Error(hashError.message);

  const { data: lecturer } = await supabase
    .from("profiles")
    .select("id")
    .eq("identifier", "DEV-DOSEN-001")
    .single();

  await supabase
    .from("learning_unit_versions")
    .update({ status: "archived" })
    .eq("learning_unit_id", unitId)
    .eq("status", "published");

  const { error } = await supabase.from("learning_unit_versions").insert({
    learning_unit_id: unitId,
    version_number: versionNumber,
    snapshot_jsonb: snapshot,
    content_hash: hash,
    status: "published",
    published_at: new Date().toISOString(),
    created_by: lecturer!.id,
  });
  if (error) throw new Error(error.message);
}

test.describe("Versioning unit pada jalur baca mahasiswa", () => {
  test.describe.configure({ mode: "serial" });

  let unit: DisposableUnit;

  test.beforeAll(async () => {
    unit = await createDisposableUnit();

    const supabase = admin();
    await supabase
      .from("cases")
      .update({ body: BODY_V1 })
      .eq("id", unit.caseId);

    await publishVersion(unit.unitId, 1);
  });

  test("mahasiswa membaca stimulus dari versi terbit, lalu tetap padanya setelah dosen menerbitkan versi baru", async ({
    page,
  }) => {
    await page.goto(`/app/student/learn/${unit.unitId}/stage/interpretation`);
    await expect(page.getByText(BODY_V1)).toBeVisible();

    await page
      .getByLabel(/Tuliskan jawaban Anda/i)
      .fill("Respons awal saya atas kasus versi pertama ini, cukup panjang.");
    await page.locator('[data-slot="submit-attempt"]').click();
    await expect(page.getByLabel(/Tuliskan jawaban Anda/i)).toHaveCount(0);

    // Dosen merevisi kasus dan menerbitkan versi kedua.
    const supabase = admin();
    await supabase
      .from("cases")
      .update({ body: BODY_V2 })
      .eq("id", unit.caseId);
    await publishVersion(unit.unitId, 2);

    await page.reload();

    // Terikat ke versi pertama: teks lama tetap, teks baru tidak pernah muncul.
    await expect(page.getByText(BODY_V1)).toBeVisible();
    await expect(page.getByText(BODY_V2)).toHaveCount(0);
  });
});
