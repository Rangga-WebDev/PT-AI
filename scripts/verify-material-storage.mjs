/** @format */

// Verifikasi sekali jalan: membuktikan kontrak Storage bahan ajar pada
// Supabase sungguhan. pgTAP tidak dapat menjangkau Storage API, sehingga
// bagian ini tidak terbukti oleh test:db.

import { createClient } from "@supabase/supabase-js";
import { createHash, randomUUID } from "node:crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Env Supabase tidak lengkap.");

const db = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let pass = 0;
let fail = 0;
const ok = (label, condition, detail = "") => {
  if (condition) {
    pass += 1;
    console.log(`  ok   ${label}`);
  } else {
    fail += 1;
    console.log(`  FAIL ${label} ${detail}`);
  }
};

const { data: klass, error: classError } = await db
  .from("classes")
  .select("id")
  .is("deleted_at", null)
  .limit(1)
  .maybeSingle();
if (classError || !klass) throw new Error("Tidak ada kelas untuk diuji.");

const { data: lecturer } = await db
  .from("class_lecturers")
  .select("lecturer_id")
  .eq("class_id", klass.id)
  .limit(1)
  .maybeSingle();

const classId = klass.id;
const resourceId = randomUUID();
const bytes = new TextEncoder().encode("# RPS uji\n\nIsi bahan ajar uji.");
const checksum = createHash("sha256").update(bytes).digest("hex");
const baseRow = {
  class_id: classId,
  title: "Bahan uji kontrak storage",
  resource_type: "file",
  material_kind: "rps",
  visibility: "student",
  mime_type: "text/markdown",
  size_bytes: bytes.byteLength,
  original_filename: "rps-uji.md",
  checksum,
  created_by: lecturer?.lecturer_id ?? null,
};

console.log("\n1. Trigger bentuk kunci objek");

const wrongKey = await db
  .from("learning_resources")
  .insert({ ...baseRow, id: randomUUID(), storage_path: `${classId}/salah` });
ok(
  "kunci di luar bentuk {class_id}/{id} ditolak",
  wrongKey.error !== null,
  wrongKey.error ? "" : "-> baris justru diterima",
);

const foreignKey = await db.from("learning_resources").insert({
  ...baseRow,
  id: randomUUID(),
  storage_path: `${randomUUID()}/${randomUUID()}`,
});
ok(
  "kunci milik kelas lain ditolak",
  foreignKey.error !== null,
  foreignKey.error ? "" : "-> baris justru diterima",
);

console.log("\n2. Constraint metadata dan batas");

const noMeta = await db.from("learning_resources").insert({
  ...baseRow,
  id: randomUUID(),
  mime_type: null,
  size_bytes: null,
  original_filename: null,
  storage_path: `${classId}/${randomUUID()}`,
});
ok("storage_path tanpa metadata ditolak", noMeta.error !== null);

const badMime = await db.from("learning_resources").insert({
  ...baseRow,
  id: randomUUID(),
  mime_type: "text/html",
  storage_path: `${classId}/${randomUUID()}`,
});
ok("MIME di luar allowlist ditolak", badMime.error !== null);

const tooBig = await db.from("learning_resources").insert({
  ...baseRow,
  id: randomUUID(),
  size_bytes: 26_214_401,
  storage_path: `${classId}/${randomUUID()}`,
});
ok("ukuran di atas 25 MB ditolak", tooBig.error !== null);

console.log("\n3. Jalur sah: baris, unggah, signed URL");

const insert = await db.from("learning_resources").insert({
  ...baseRow,
  id: resourceId,
  storage_path: `${classId}/${resourceId}`,
});
ok(
  "baris dengan kunci sah diterima",
  insert.error === null,
  insert.error?.message ?? "",
);

const upload = await db.storage
  .from("materials")
  .upload(`${classId}/${resourceId}`, bytes, {
    contentType: "text/markdown",
    upsert: false,
  });
ok(
  "objek terunggah ke bucket materials",
  upload.error === null,
  upload.error?.message ?? "",
);

const anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const anonRead = await anon.storage
  .from("materials")
  .download(`${classId}/${resourceId}`);
ok("bucket tertutup bagi klien tanpa sesi", anonRead.error !== null);

const signed = await db.storage
  .from("materials")
  .createSignedUrl(`${classId}/${resourceId}`, 300, { download: "rps-uji.md" });
ok(
  "signed URL terbit",
  signed.error === null && Boolean(signed.data?.signedUrl),
  signed.error?.message ?? "",
);

if (signed.data?.signedUrl) {
  const response = await fetch(signed.data.signedUrl);
  const body = await response.text();
  ok(
    "signed URL mengembalikan isi yang sama",
    body === new TextDecoder().decode(bytes),
    `status ${response.status}`,
  );
}

console.log("\n4. Plumbing status ekstraksi");

const succeededWithoutText = await db
  .from("learning_resources")
  .update({ extraction_status: "succeeded", extracted_text: null })
  .eq("id", resourceId);
ok("succeeded tanpa teks ditolak", succeededWithoutText.error !== null);

const extracted = await db
  .from("learning_resources")
  .update({
    extraction_status: "succeeded",
    extracted_text: new TextDecoder().decode(bytes),
    extracted_at: new Date().toISOString(),
  })
  .eq("id", resourceId);
ok(
  "succeeded dengan teks diterima",
  extracted.error === null,
  extracted.error?.message ?? "",
);

const rewriteKey = await db
  .from("learning_resources")
  .update({ storage_path: `${classId}/${randomUUID()}` })
  .eq("id", resourceId);
ok(
  "kunci objek tidak dapat dialihkan lewat UPDATE",
  rewriteKey.error !== null,
  rewriteKey.error ? "" : "-> UPDATE justru diterima",
);

console.log("\n5. Bersih-bersih");
await db.storage.from("materials").remove([`${classId}/${resourceId}`]);
const cleanup = await db
  .from("learning_resources")
  .delete()
  .eq("id", resourceId);
ok("baris uji terhapus", cleanup.error === null, cleanup.error?.message ?? "");

console.log(`\n${pass} lulus, ${fail} gagal`);
process.exit(fail === 0 ? 0 : 1);
