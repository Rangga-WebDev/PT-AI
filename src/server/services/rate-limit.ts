/** @format */

import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * Batas dipisahkan per operasi karena biayanya berbeda: mengunggah berkas
 * membebani penyimpanan, sedangkan operasi AI membebani kuota penyedia.
 */
export const RATE_LIMITS = {
  material_upload: { limit: 20, windowSeconds: 3_600 },
  quick_setup: { limit: 10, windowSeconds: 3_600 },
  ai_review: { limit: 60, windowSeconds: 3_600 },
} as const;

export type RateLimitAction = keyof typeof RATE_LIMITS;

export const RATE_LIMIT_MESSAGE: Record<RateLimitAction, string> = {
  material_upload:
    "Terlalu banyak unggahan dalam satu jam terakhir. Coba lagi nanti.",
  quick_setup:
    "Terlalu banyak penyusunan draf dalam satu jam terakhir. Coba lagi nanti.",
  ai_review:
    "Terlalu banyak permintaan bantuan AI dalam satu jam terakhir. Coba lagi nanti.",
};

/**
 * Mengembalikan false ketika batas terlampaui. Kegagalan teknis sengaja
 * dianggap lolos: pembatas laju tidak boleh menjadi sebab pekerjaan sah
 * tertolak, dan penegakan sesungguhnya tetap ada pada otorisasi.
 */
export async function consumeRateLimit(
  action: RateLimitAction,
): Promise<boolean> {
  const supabase = await createClient();
  const { limit, windowSeconds } = RATE_LIMITS[action];

  const { data, error } = await supabase.rpc("consume_rate_limit", {
    p_action: action,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    console.error("[rate-limit] penghitung gagal", {
      action,
      sqlstate: error.code ?? null,
    });
    return true;
  }

  return data !== false;
}
