/** @format */

import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Pemeliharaan berkala yang dipanggil penjadwal penyebaran. Endpoint ini
 * memakai koneksi istimewa, sehingga aksesnya dijaga rahasia bersama, bukan
 * oleh sesi pengguna.
 *
 * Vercel Cron mengirim `Authorization: Bearer <CRON_SECRET>`; nama variabel
 * itulah yang dipakai di sini agar tidak ada penyalinan rahasia yang kedua.
 */

export const dynamic = "force-dynamic";

/** Perbandingan bersuhu tetap agar panjang rahasia tidak bocor lewat waktu. */
function matches(provided: string, expected: string): boolean {
  if (provided.length !== expected.length) return false;

  let diff = 0;
  for (let index = 0; index < provided.length; index += 1) {
    diff |= provided.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return diff === 0;
}

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  return token.length > 0 && matches(token, secret);
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Tidak berwenang." }, { status: 401 });
  }

  const supabase = createAdminClient();

  const [sessions, counters] = await Promise.all([
    supabase.rpc("close_stale_learning_sessions", {
      p_idle_minutes: 30,
      p_max_hours: 8,
    }),
    supabase.rpc("prune_rate_limit_counters", { p_older_than_hours: 48 }),
  ]);

  if (sessions.error || counters.error) {
    console.error("[maintenance] gagal", {
      at: new Date().toISOString(),
      sessions: sessions.error?.code ?? null,
      counters: counters.error?.code ?? null,
    });
    return NextResponse.json({ error: "Pemeliharaan gagal." }, { status: 500 });
  }

  return NextResponse.json(
    {
      ok: true,
      closedSessions: sessions.data ?? 0,
      prunedCounters: counters.data ?? 0,
    },
    { headers: { "cache-control": "no-store" } },
  );
}

/** Vercel Cron memanggil dengan GET; perlakuannya sama persis. */
export async function GET(request: Request): Promise<NextResponse> {
  return POST(request);
}
