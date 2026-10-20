/** @format */

import type { EvidencePacket } from "./evidence-packet";
import type { CriterionSuggestion, ReviewSuggestion } from "./review-schema";

export const REVIEW_STREAM_PATH = "/api/lecturer/ai-review";

/** Satu baris NDJSON dari rute bantuan review AI. */
export type ReviewStreamEvent =
  | {
      type: "meta";
      criteria: EvidencePacket["criteria"];
      artifacts: { id: string; label: string; studentAuthored: boolean }[];
      model: string;
      promptVersion: number;
    }
  | { type: "criterion"; entry: CriterionSuggestion }
  | { type: "done"; suggestion: ReviewSuggestion }
  | { type: "error"; error: string; status?: number };

const UNREACHABLE =
  "Bantuan AI tidak dapat dihubungi. Periksa koneksi lalu coba lagi.";
const UNREADABLE = "Respons bantuan AI tidak dapat dibaca.";
const INTERRUPTED = "Koneksi terputus sebelum analisis selesai. Coba lagi.";

/**
 * Meneruskan setiap peristiwa begitu barisnya utuh. Aliran yang berhenti tanpa
 * peristiwa akhir dilaporkan sebagai galat, bukan dianggap selesai.
 */
export async function streamAiReview(
  attemptId: string,
  onEvent: (event: ReviewStreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  let response: Response;
  try {
    response = await fetch(REVIEW_STREAM_PATH, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ attemptId }),
      ...(signal ? { signal } : {}),
    });
  } catch {
    if (!signal?.aborted) onEvent({ type: "error", error: UNREACHABLE });
    return;
  }

  if (!response.ok || !response.body) {
    const payload = (await response.json().catch(() => null)) as {
      error?: unknown;
    } | null;
    onEvent({
      type: "error",
      error:
        typeof payload?.error === "string"
          ? payload.error
          : "Bantuan AI gagal dijalankan.",
      status: response.status,
    });
    return;
  }

  let finished = false;
  const emit = (line: string) => {
    if (finished || line.trim() === "") return;
    let event: ReviewStreamEvent;
    try {
      event = JSON.parse(line) as ReviewStreamEvent;
    } catch {
      event = { type: "error", error: UNREADABLE };
    }
    if (event.type === "done" || event.type === "error") finished = true;
    onEvent(event);
  };

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";

  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value;
      let newline = buffer.indexOf("\n");
      while (newline >= 0) {
        emit(buffer.slice(0, newline));
        buffer = buffer.slice(newline + 1);
        newline = buffer.indexOf("\n");
      }
    }
    emit(buffer);
  } catch {
    if (signal?.aborted) return;
  }

  if (!finished && !signal?.aborted) {
    onEvent({ type: "error", error: INTERRUPTED });
  }
}
