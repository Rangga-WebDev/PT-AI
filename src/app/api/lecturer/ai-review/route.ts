/** @format */

import { NextResponse } from "next/server";
import { z } from "zod";

import type { ReviewStreamEvent } from "@/lib/ai/review-stream";
import { requireRoleOrThrow } from "@/lib/supabase/auth";
import {
  prepareReview,
  REVIEW_MESSAGE,
  streamReview,
  type ReviewFailure,
} from "@/server/ai/lecturer-review";
import { CHAT_MODEL } from "@/server/ai/provider";
import { REVIEW_PROMPT_VERSION } from "@/server/ai/review-prompt";
import {
  consumeRateLimit,
  RATE_LIMIT_MESSAGE,
} from "@/server/services/rate-limit";

const bodySchema = z.object({ attemptId: z.string().uuid() });

const STATUS_BY_REASON: Partial<Record<ReviewFailure, number>> = {
  attempt_not_found: 404,
  forbidden: 403,
  no_rubric: 422,
  incomplete_rubric: 422,
};

function reject(error: string, status: number): NextResponse {
  return NextResponse.json({ error }, { status });
}

/**
 * Bantuan review AI dialirkan sebagai NDJSON agar usulan per kriteria tampil
 * begitu lolos validasi. Semua yang bergantung pada sesi selesai sebelum
 * respons dikirim; aliran hanya memakai penyedia AI dan klien admin.
 */
export async function POST(request: Request): Promise<Response> {
  // Wajib JSON: permintaan lintas asal jenis ini selalu memerlukan preflight.
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return reject("Permintaan tidak valid.", 415);
  }

  let lecturer;
  try {
    lecturer = await requireRoleOrThrow("lecturer");
  } catch {
    return reject("Bantuan review AI hanya untuk dosen.", 403);
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return reject("Pekerjaan tidak valid.", 400);

  if (!(await consumeRateLimit("ai_review"))) {
    return reject(RATE_LIMIT_MESSAGE.ai_review, 429);
  }

  const prepared = await prepareReview(parsed.data.attemptId);
  if (!prepared.ok) {
    return reject(
      REVIEW_MESSAGE[prepared.reason],
      STATUS_BY_REASON[prepared.reason] ?? 400,
    );
  }

  const steps = streamReview(prepared, lecturer.id);
  const encoder = new TextEncoder();
  const line = (event: ReviewStreamEvent) =>
    encoder.encode(`${JSON.stringify(event)}\n`);

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(
        line({
          type: "meta",
          criteria: prepared.packet.criteria,
          // Isi artefak tidak dikirim; panel hanya perlu menamai bukti yang dirujuk.
          artifacts: prepared.packet.artifacts.map((item) => ({
            id: item.id,
            label: item.label,
            studentAuthored: item.studentAuthored,
          })),
          model: CHAT_MODEL,
          promptVersion: REVIEW_PROMPT_VERSION,
        }),
      );
    },
    async pull(controller) {
      try {
        const { value, done } = await steps.next();
        if (done) {
          controller.close();
          return;
        }
        controller.enqueue(
          line(
            value.type === "error"
              ? { type: "error", error: REVIEW_MESSAGE[value.reason] }
              : value,
          ),
        );
      } catch {
        controller.enqueue(
          line({ type: "error", error: "Bantuan AI gagal dijalankan." }),
        );
        controller.close();
      }
    },
    async cancel() {
      await steps.return(undefined);
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
