/** @format */

"use server";

import { z } from "zod";

import { toActionError } from "@/lib/errors";
import { requireRoleOrThrow } from "@/lib/supabase/auth";
import {
  requestReviewSuggestion,
  REVIEW_MESSAGE,
} from "@/server/ai/lecturer-review";
import type { EvidencePacket } from "@/lib/ai/evidence-packet";
import type { ReviewSuggestion } from "@/lib/ai/review-schema";

const attemptSchema = z.object({
  attemptId: z.string().uuid("Pekerjaan tidak valid."),
});

export type ReviewSuggestionState =
  | {
      ok: true;
      suggestion: ReviewSuggestion;
      criteria: EvidencePacket["criteria"];
      artifacts: { id: string; label: string; studentAuthored: boolean }[];
      model: string;
      promptVersion: number;
    }
  | { ok: false; error: string };

/**
 * Bantuan AI hanya berjalan ketika dosen memintanya, dan tidak pernah menulis
 * nilai. Yang dikembalikan aksi ini semata usulan untuk dilihat, diubah, atau
 * diabaikan pada formulir penilaian yang sudah ada.
 */
export async function requestAiReviewAction(
  attemptId: string,
): Promise<ReviewSuggestionState> {
  try {
    const lecturer = await requireRoleOrThrow("lecturer");

    const parsed = attemptSchema.safeParse({ attemptId });
    if (!parsed.success) {
      return { ok: false, error: "Pekerjaan tidak valid." };
    }

    const result = await requestReviewSuggestion(
      parsed.data.attemptId,
      lecturer.id,
    );

    if (!result.ok) {
      return { ok: false, error: REVIEW_MESSAGE[result.reason] };
    }

    return {
      ok: true,
      suggestion: result.data.suggestion,
      criteria: result.data.packet.criteria,
      // Kunci artefak dikirim tanpa isinya: panel hanya perlu menamai bukti
      // yang dirujuk, bukan menampilkan ulang seluruh pekerjaan.
      artifacts: result.data.packet.artifacts.map((item) => ({
        id: item.id,
        label: item.label,
        studentAuthored: item.studentAuthored,
      })),
      model: result.data.model,
      promptVersion: result.data.promptVersion,
    };
  } catch (error) {
    const mapped = toActionError(error);
    return {
      ok: false,
      error: mapped.ok ? "Bantuan AI gagal dijalankan." : mapped.error,
    };
  }
}
