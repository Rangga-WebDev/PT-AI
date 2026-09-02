/** @format */

// Membersihkan akun auth dan objek Storage lewat API admin Supabase.
//
// Menghapus baris `auth.users` atau `storage.objects` langsung lewat SQL akan
// meninggalkan berkas fisik di penyimpanan dan memutus pembukuan GoTrue.
// Karena itu keduanya dilakukan lewat jalur resmi.
//
// Jalankan: npm run db:purge -- --yes --confirm-project=<ref>

import process from "node:process";

import { createClient } from "@supabase/supabase-js";

import { requireDestructiveConfirmation } from "./destructive-guard.mjs";

requireDestructiveConfirmation("Penghapusan seluruh akun dan berkas Storage");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("\n[GAGAL] Env Supabase tidak lengkap.\n");
  process.exit(1);
}

const db = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// === Storage ================================================================

const { data: buckets, error: bucketError } = await db.storage.listBuckets();
if (bucketError) {
  console.error(`\n[GAGAL] daftar bucket: ${bucketError.message}\n`);
  process.exit(1);
}

let removedObjects = 0;

/** Storage tidak punya penghapusan rekursif; pohon ditelusuri sendiri. */
async function purgeFolder(bucket, prefix) {
  const { data, error } = await db.storage.from(bucket).list(prefix, {
    limit: 1000,
  });
  if (error) throw new Error(`${bucket}/${prefix}: ${error.message}`);

  const files = [];
  for (const entry of data ?? []) {
    const full = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.id === null) await purgeFolder(bucket, full);
    else files.push(full);
  }

  if (files.length > 0) {
    const { error: removeError } = await db.storage.from(bucket).remove(files);
    if (removeError) throw new Error(`${bucket}: ${removeError.message}`);
    removedObjects += files.length;
  }
}

for (const bucket of buckets) {
  await purgeFolder(bucket.id, "");
  const { error } = await db.storage.deleteBucket(bucket.id);
  if (error) {
    console.error(`\n[GAGAL] hapus bucket ${bucket.id}: ${error.message}\n`);
    process.exit(1);
  }
}

console.log(`objek storage dihapus : ${removedObjects}`);
console.log(`bucket dihapus        : ${buckets.length}`);

// === Auth ===================================================================

let removedUsers = 0;
for (;;) {
  const { data, error } = await db.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (error) {
    console.error(`\n[GAGAL] daftar pengguna: ${error.message}\n`);
    process.exit(1);
  }
  if (data.users.length === 0) break;

  for (const user of data.users) {
    const { error: deleteError } = await db.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error(`\n[GAGAL] hapus pengguna: ${deleteError.message}\n`);
      process.exit(1);
    }
    removedUsers += 1;
  }
}

const { data: remaining } = await db.auth.admin.listUsers({
  page: 1,
  perPage: 1,
});

console.log(`akun auth dihapus     : ${removedUsers}`);
console.log(`akun auth tersisa     : ${remaining?.users.length ?? 0}`);
