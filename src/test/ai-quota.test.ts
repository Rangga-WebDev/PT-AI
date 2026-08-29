/** @format */

import { describe, expect, it } from "vitest";

import {
  AI_DAILY_QUOTA,
  AI_HOURLY_QUOTA,
  evaluateAiQuota,
} from "@/lib/ai/quota";

describe("evaluateAiQuota", () => {
  it("mengizinkan permintaan ketika pemakaian masih di bawah batas", () => {
    const verdict = evaluateAiQuota({ lastHourCount: 1, lastDayCount: 3 });

    expect(verdict.allowed).toBe(true);
    expect(verdict.remainingToday).toBe(AI_DAILY_QUOTA - 3);
  });

  it("menolak ketika batas per jam tercapai", () => {
    const verdict = evaluateAiQuota({
      lastHourCount: AI_HOURLY_QUOTA,
      lastDayCount: AI_HOURLY_QUOTA,
    });

    expect(verdict.allowed).toBe(false);
    expect(verdict.reason).toMatch(/per jam/i);
  });

  it("menolak ketika batas harian tercapai meski jam ini belum dipakai", () => {
    const verdict = evaluateAiQuota({
      lastHourCount: 0,
      lastDayCount: AI_DAILY_QUOTA,
    });

    expect(verdict.allowed).toBe(false);
    expect(verdict.reason).toMatch(/harian/i);
    expect(verdict.remainingToday).toBe(0);
  });

  it("mendahulukan batas harian ketika keduanya terlampaui", () => {
    const verdict = evaluateAiQuota({
      lastHourCount: AI_HOURLY_QUOTA,
      lastDayCount: AI_DAILY_QUOTA,
    });

    expect(verdict.reason).toMatch(/harian/i);
  });

  it("tidak pernah melaporkan sisa kuota negatif", () => {
    const verdict = evaluateAiQuota({
      lastHourCount: 0,
      lastDayCount: AI_DAILY_QUOTA + 50,
    });

    expect(verdict.remainingToday).toBe(0);
  });

  it("mengarahkan mahasiswa kembali ke penalarannya sendiri, bukan sekadar menolak", () => {
    const verdict = evaluateAiQuota({
      lastHourCount: 0,
      lastDayCount: AI_DAILY_QUOTA,
    });

    expect(verdict.reason).toMatch(/penalaran Anda sendiri/i);
  });

  it("batas per jam tidak boleh melebihi batas harian", () => {
    expect(AI_HOURLY_QUOTA).toBeLessThanOrEqual(AI_DAILY_QUOTA);
  });
});
