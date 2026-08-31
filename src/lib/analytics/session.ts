/** @format */

// Parameter pelacakan durasi aktif. Nilai-nilai ini adalah kebijakan
// penelitian, bukan detail implementasi: heartbeat 30 detik hanya saat
// pengguna aktif, sesi ditutup setelah 5 menit tanpa kabar, dan satu sesi
// tidak pernah melebihi 4 jam.

export const HEARTBEAT_INTERVAL_MS = 30_000;
export const IDLE_CUTOFF_MS = 5 * 60_000;
export const SESSION_MAX_SECONDS = 14_400;

/**
 * Batas tambahan per heartbeat. Klien tidak pernah mengirim angka durasi; ia
 * hanya melapor masih aktif. Selisih dihitung dari jam server lalu dipotong,
 * sehingga heartbeat yang dibanjiri maupun yang tertunda lama tidak dapat
 * menggelembungkan angka.
 */
export const MAX_INCREMENT_SECONDS = 60;

export function secondsBetween(from: string, to: string): number {
  const delta = (new Date(to).getTime() - new Date(from).getTime()) / 1000;
  return Number.isFinite(delta) && delta > 0 ? delta : 0;
}

export function nextActiveSeconds(
  currentSeconds: number,
  lastHeartbeatAt: string,
  now: string,
): number {
  const increment = Math.min(
    Math.floor(secondsBetween(lastHeartbeatAt, now)),
    MAX_INCREMENT_SECONDS,
  );

  return Math.min(currentSeconds + increment, SESSION_MAX_SECONDS);
}

export function isSessionStale(lastHeartbeatAt: string, now: string): boolean {
  return secondsBetween(lastHeartbeatAt, now) * 1000 >= IDLE_CUTOFF_MS;
}

export function shouldRollover(startedAt: string, now: string): boolean {
  return secondsBetween(startedAt, now) >= SESSION_MAX_SECONDS;
}
