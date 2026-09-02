/** @format */

// Verifikasi sekali jalan untuk /api/maintenance. Cron Vercel tidak dapat
// ditunggu di mesin lokal, sehingga yang dibuktikan di sini adalah kontraknya:
// endpoint tertutup tanpa rahasia yang benar, dan sekali dipanggil ia benar
// benar membereskan sesi terbengkalai serta pencacah laju kedaluwarsa —
// tanpa menyentuh baris yang masih hidup.
//
// Menjalankan: server produksi harus sudah menyala di BASE_URL.

import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const secret = process.env.CRON_SECRET;
const base = process.env.BASE_URL ?? "http://127.0.0.1:3000";

if (!url || !key) throw new Error("Env Supabase tidak lengkap.");
if (!secret) throw new Error("CRON_SECRET belum disetel.");

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

const call = (token) =>
  fetch(`${base}/api/maintenance`, {
    method: "POST",
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });

// === Penjagaan rahasia ======================================================

ok("Tanpa header otorisasi ditolak 401", (await call(null)).status === 401);
ok(
  "Rahasia keliru ditolak 401",
  (await call("bukan-rahasia-yang-benar")).status === 401,
);
ok(
  "Rahasia benar tetapi terpotong ditolak 401",
  (await call(secret.slice(0, -1))).status === 401,
);

// === Fixture ================================================================

// Basis data pilot yang bersih belum punya kelas, dan menanam data hanya demi
// pengujian justru mengotorinya. Bagian berfixture karena itu dilewati, sambil
// tetap membuktikan panggilan sah berhasil.
const { data: enrollment } = await db
  .from("enrollments")
  .select("student_id, class_id")
  .limit(1)
  .maybeSingle();

if (!enrollment) {
  const response = await call(secret);
  const body = await response.json();

  ok(
    "Rahasia benar diterima 200",
    response.status === 200,
    `status ${response.status}`,
  );
  ok("Balasan menyatakan berhasil", body.ok === true);

  console.log(
    "\n  (dilewati) Pemeriksaan pembersihan menuntut kelas berisi mahasiswa;",
  );
  console.log("             basis data ini sengaja kosong.");
  console.log(`\n  ${pass} lulus, ${fail} gagal.`);
  process.exit(fail === 0 ? 0 : 1);
}

const { data: activity, error: activityError } = await db
  .from("activities")
  .select(
    "id, learning_stages!inner(learning_units!inner(modules!inner(class_id)))",
  )
  .eq("learning_stages.learning_units.modules.class_id", enrollment.class_id)
  .limit(1)
  .single();
if (activityError) throw new Error(activityError.message);

const student = enrollment.student_id;
const hour = 3_600_000;
const now = Date.now();
const iso = (ms) => new Date(now - ms).toISOString();

// Sesi terbengkalai dan sesi yang masih hidup harus dapat dibedakan, tetapi
// indeks unik hanya mengizinkan satu sesi terbuka per (mahasiswa, aktivitas).
// Karena itu sesi yang masih hidup dititipkan pada profil lain.
const { data: other, error: otherError } = await db
  .from("profiles")
  .select("id")
  .neq("id", enrollment.student_id)
  .limit(1)
  .single();
if (otherError) throw new Error(`profil pembanding: ${otherError.message}`);

const staleId = randomUUID();
const freshId = randomUUID();

await db
  .from("learning_sessions")
  .delete()
  .in("student_id", [student, other.id])
  .is("ended_at", null);

const { error: staleError } = await db.from("learning_sessions").insert({
  id: staleId,
  student_id: student,
  activity_id: activity.id,
  started_at: iso(2 * hour),
  last_heartbeat_at: iso(1.5 * hour),
  heartbeat_count: 3,
});
if (staleError) throw new Error(`sesi basi: ${staleError.message}`);

const { error: freshError } = await db.from("learning_sessions").insert({
  id: freshId,
  student_id: other.id,
  activity_id: activity.id,
  started_at: iso(0.1 * hour),
  last_heartbeat_at: iso(0.02 * hour),
  heartbeat_count: 2,
});
if (freshError) throw new Error(`sesi segar: ${freshError.message}`);

const staleWindow = Math.floor((now / 1000 - 72 * 3600) / 3600) * 3600;
const freshWindow = Math.floor(now / 1000 / 3600) * 3600;

await db.from("rate_limit_counters").delete().eq("actor_id", student);
const { error: counterError } = await db.from("rate_limit_counters").insert([
  {
    actor_id: student,
    action: "verify_stale",
    window_start: new Date(staleWindow * 1000).toISOString(),
    hits: 7,
  },
  {
    actor_id: student,
    action: "verify_fresh",
    window_start: new Date(freshWindow * 1000).toISOString(),
    hits: 2,
  },
]);
if (counterError) throw new Error(`pencacah: ${counterError.message}`);

const eventsBefore = await db
  .from("learning_events")
  .select("id", { count: "exact", head: true })
  .eq("student_id", student);

// === Pemanggilan sah ========================================================

const response = await call(secret);
const body = await response.json();

ok(
  "Rahasia benar diterima 200",
  response.status === 200,
  `status ${response.status}`,
);
ok("Balasan menyatakan berhasil", body.ok === true);
ok(
  "Sesi terbengkalai terhitung ditutup",
  (body.closedSessions ?? 0) >= 1,
  JSON.stringify(body),
);
ok(
  "Pencacah kedaluwarsa terhitung dibuang",
  (body.prunedCounters ?? 0) >= 1,
  JSON.stringify(body),
);

const { data: staleAfter } = await db
  .from("learning_sessions")
  .select("ended_at, end_reason")
  .eq("id", staleId)
  .single();
ok("Sesi terbengkalai benar-benar tertutup", staleAfter?.ended_at !== null);
ok(
  "Alasan penutupan tercatat idle_timeout",
  staleAfter?.end_reason === "idle_timeout",
  String(staleAfter?.end_reason),
);

const { data: freshAfter } = await db
  .from("learning_sessions")
  .select("ended_at")
  .eq("id", freshId)
  .single();
ok("Sesi yang masih hidup tidak diganggu", freshAfter?.ended_at === null);

const { data: countersAfter } = await db
  .from("rate_limit_counters")
  .select("action")
  .eq("actor_id", student);
const actions = (countersAfter ?? []).map((row) => row.action);
ok(
  "Pencacah kedaluwarsa terhapus",
  !actions.includes("verify_stale"),
  actions.join(","),
);
ok(
  "Pencacah jendela berjalan dipertahankan",
  actions.includes("verify_fresh"),
  actions.join(","),
);

const eventsAfter = await db
  .from("learning_events")
  .select("id", { count: "exact", head: true })
  .eq("student_id", student);
ok(
  "Penutupan menerbitkan tepat satu peristiwa penelitian",
  (eventsAfter.count ?? 0) - (eventsBefore.count ?? 0) === 1,
  `${eventsBefore.count} -> ${eventsAfter.count}`,
);

// Pemanggilan kedua tidak boleh menutup apa pun lagi.
const second = await (await call(secret)).json();
ok(
  "Pemanggilan ulang tidak menutup sesi lain",
  (second.closedSessions ?? 0) === 0,
  JSON.stringify(second),
);

// === Bersih-bersih ==========================================================

await db.from("rate_limit_counters").delete().eq("actor_id", student);
await db.from("learning_sessions").delete().in("id", [staleId, freshId]);

console.log(`\n  ${pass} lulus, ${fail} gagal.`);
process.exit(fail === 0 ? 0 : 1);
