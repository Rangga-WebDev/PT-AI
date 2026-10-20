/** @format */

// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  REVIEW_STREAM_PATH,
  streamAiReview,
  type ReviewStreamEvent,
} from "@/lib/ai/review-stream";

const ATTEMPT_ID = "11111111-1111-4111-8111-111111111111";

function streamOf(parts: string[]): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const part of parts) controller.enqueue(encoder.encode(part));
      controller.close();
    },
  });
  return new Response(body, {
    headers: { "content-type": "application/x-ndjson" },
  });
}

async function collect(response: Response): Promise<ReviewStreamEvent[]> {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => response),
  );
  const events: ReviewStreamEvent[] = [];
  await streamAiReview(ATTEMPT_ID, (event) => events.push(event));
  return events;
}

const criterion = {
  type: "criterion",
  entry: {
    criterionId: "k1",
    suggestedScore: 3,
    confidence: "medium",
    evidence: [],
    rationale: "Alasan yang cukup panjang.",
    insufficientEvidence: false,
  },
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("streamAiReview", () => {
  it("mengirim permintaan JSON ke rute review", async () => {
    const fetchMock = vi.fn(async () =>
      streamOf([`${JSON.stringify({ type: "error", error: "x" })}\n`]),
    );
    vi.stubGlobal("fetch", fetchMock);

    await streamAiReview(ATTEMPT_ID, () => {});

    expect(fetchMock).toHaveBeenCalledWith(
      REVIEW_STREAM_PATH,
      expect.objectContaining({
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ attemptId: ATTEMPT_ID }),
      }),
    );
  });

  it("meneruskan peristiwa walau satu baris terbelah di beberapa potongan", async () => {
    const line = `${JSON.stringify(criterion)}\n`;
    const done = `${JSON.stringify({ type: "done", suggestion: {} })}\n`;

    const events = await collect(
      streamOf([
        line.slice(0, 10),
        line.slice(10),
        done.slice(0, 5),
        done.slice(5),
      ]),
    );

    expect(events.map((event) => event.type)).toEqual(["criterion", "done"]);
  });

  it("melaporkan aliran yang berhenti tanpa peristiwa akhir", async () => {
    const events = await collect(streamOf([`${JSON.stringify(criterion)}\n`]));

    expect(events.at(-1)).toEqual({
      type: "error",
      error: "Koneksi terputus sebelum analisis selesai. Coba lagi.",
    });
  });

  it("meneruskan pesan galat dari respons non-aliran", async () => {
    const events = await collect(
      Response.json(
        { error: "Batas permintaan bantuan review AI tercapai." },
        { status: 429 },
      ),
    );

    expect(events).toEqual([
      {
        type: "error",
        error: "Batas permintaan bantuan review AI tercapai.",
        status: 429,
      },
    ]);
  });

  it("tidak melaporkan apa pun setelah dibatalkan", async () => {
    const controller = new AbortController();
    controller.abort();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new DOMException("aborted", "AbortError");
      }),
    );
    const events: ReviewStreamEvent[] = [];

    await streamAiReview(
      ATTEMPT_ID,
      (event) => events.push(event),
      controller.signal,
    );

    expect(events).toEqual([]);
  });
});
