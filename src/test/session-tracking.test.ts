/** @format */

import { describe, expect, it } from "vitest";

import {
  IDLE_CUTOFF_MS,
  MAX_INCREMENT_SECONDS,
  SESSION_MAX_SECONDS,
  isSessionStale,
  nextActiveSeconds,
  shouldRollover,
} from "@/lib/analytics/session";

const T0 = "2026-08-31T10:00:00.000Z";

function plus(seconds: number): string {
  return new Date(new Date(T0).getTime() + seconds * 1000).toISOString();
}

describe("nextActiveSeconds", () => {
  it("menambah selisih waktu server sejak heartbeat terakhir", () => {
    expect(nextActiveSeconds(100, T0, plus(30))).toBe(130);
  });

  it("memotong tambahan pada batas maksimum per heartbeat", () => {
    expect(nextActiveSeconds(0, T0, plus(3600))).toBe(MAX_INCREMENT_SECONDS);
  });

  it("tidak menambah apa pun bila waktu mundur", () => {
    expect(nextActiveSeconds(50, plus(30), T0)).toBe(50);
  });

  it("tidak pernah melampaui plafon empat jam", () => {
    expect(nextActiveSeconds(SESSION_MAX_SECONDS - 10, T0, plus(60))).toBe(
      SESSION_MAX_SECONDS,
    );
  });

  it("banjir heartbeat sub-detik tidak menambah durasi", () => {
    let total = 0;
    let last = T0;

    for (let index = 1; index <= 20; index += 1) {
      const now = plus(index * 0.05);
      total = nextActiveSeconds(total, last, now);
      last = now;
    }

    expect(total).toBe(0);
  });
});

describe("isSessionStale", () => {
  it("menandai sesi basi setelah batas idle terlampaui", () => {
    expect(isSessionStale(T0, plus(IDLE_CUTOFF_MS / 1000))).toBe(true);
  });

  it("tidak menandai sesi yang masih dalam batas idle", () => {
    expect(isSessionStale(T0, plus(60))).toBe(false);
  });
});

describe("shouldRollover", () => {
  it("meminta pergantian sesi setelah empat jam", () => {
    expect(shouldRollover(T0, plus(SESSION_MAX_SECONDS))).toBe(true);
  });

  it("membiarkan sesi berjalan sebelum empat jam", () => {
    expect(shouldRollover(T0, plus(SESSION_MAX_SECONDS - 1))).toBe(false);
  });
});
