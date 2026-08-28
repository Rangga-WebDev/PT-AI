/** @format */

import { describe, expect, it } from "vitest";

import {
  draftSchema,
  MAX_ATTEMPT_LENGTH,
  submitAttemptSchema,
} from "@/lib/validation/attempts";

const ACTIVITY_ID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";
const SUBMISSION_ID = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d";

describe("Skema draf", () => {
  it("menerima draf kosong karena autosave berjalan sejak karakter pertama", () => {
    const result = draftSchema.safeParse({
      activityId: ACTIVITY_ID,
      content: "",
    });

    expect(result.success).toBe(true);
  });

  it("menolak draf yang melebihi batas panjang", () => {
    const result = draftSchema.safeParse({
      activityId: ACTIVITY_ID,
      content: "a".repeat(MAX_ATTEMPT_LENGTH + 1),
    });

    expect(result.success).toBe(false);
  });
});

describe("Skema pengiriman respons awal", () => {
  it("menolak respons yang terlalu pendek untuk ditinjau", () => {
    const result = submitAttemptSchema.safeParse({
      activityId: ACTIVITY_ID,
      content: "terlalu pendek",
      clientSubmissionId: SUBMISSION_ID,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("minimal 20 karakter");
    }
  });

  it("menolak respons yang hanya berisi spasi", () => {
    const result = submitAttemptSchema.safeParse({
      activityId: ACTIVITY_ID,
      content: "                              ",
      clientSubmissionId: SUBMISSION_ID,
    });

    expect(result.success).toBe(false);
  });

  it("mewajibkan penanda kiriman agar pengiriman ulang idempoten", () => {
    const result = submitAttemptSchema.safeParse({
      activityId: ACTIVITY_ID,
      content: "Partisipasi belum bermakna karena bukti kehadiran tipis.",
      clientSubmissionId: "bukan-uuid",
    });

    expect(result.success).toBe(false);
  });

  it("memangkas spasi tepi sebelum respons disimpan", () => {
    const result = submitAttemptSchema.safeParse({
      activityId: ACTIVITY_ID,
      content: "   Partisipasi belum bermakna karena bukti tipis.   ",
      clientSubmissionId: SUBMISSION_ID,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.content).toBe(
        "Partisipasi belum bermakna karena bukti tipis.",
      );
    }
  });
});
