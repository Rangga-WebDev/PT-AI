/** @format */

export const AI_HOURLY_QUOTA = 20;
export const AI_DAILY_QUOTA = 80;

export interface QuotaUsage {
  lastHourCount: number;
  lastDayCount: number;
}

export interface QuotaVerdict {
  allowed: boolean;
  reason?: string;
  remainingToday: number;
}

/**
 * Kuota melindungi dua hal sekaligus: biaya penyedia dan ketersediaan bagi
 * mahasiswa lain. Tanpa batas, satu akun dapat menghabiskan kuota tier gratis
 * dan mematikan bantuan AI untuk seluruh kelas.
 *
 * Batasnya dihitung dari `ai_interactions` yang append-only, sehingga pemakaian
 * tidak dapat dihapus untuk mengelabui perhitungan.
 */
export function evaluateAiQuota(usage: QuotaUsage): QuotaVerdict {
  const remainingToday = Math.max(0, AI_DAILY_QUOTA - usage.lastDayCount);

  if (usage.lastDayCount >= AI_DAILY_QUOTA) {
    return {
      allowed: false,
      reason: `Batas harian bantuan AI (${AI_DAILY_QUOTA} permintaan) sudah tercapai. Lanjutkan dengan penalaran Anda sendiri, dan coba lagi besok.`,
      remainingToday: 0,
    };
  }

  if (usage.lastHourCount >= AI_HOURLY_QUOTA) {
    return {
      allowed: false,
      reason: `Batas per jam bantuan AI (${AI_HOURLY_QUOTA} permintaan) sudah tercapai. Tunggu beberapa saat sebelum meminta bantuan lagi.`,
      remainingToday,
    };
  }

  return { allowed: true, remainingToday };
}
