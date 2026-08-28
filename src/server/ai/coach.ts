/** @format */

import "server-only";

import { createHash } from "node:crypto";

import type { AiFunction } from "@/lib/constants/stages";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import {
  buildPrompt,
  buildRetrievalQuery,
  type RetrievedChunk,
} from "./prompts";
import { getProvider } from "./provider";
import {
  aiResponseSchema,
  providerResponseSchema,
  type AiResponseItem,
} from "./schemas";
import { SYSTEM_INSTRUCTION } from "./prompts";

export interface CoachRequest {
  studentId: string;
  activityId: string;
  attemptId: string;
  function: AiFunction;
}

export interface CoachFeedbackItem {
  id: string;
  kind: string;
  title: string;
  body: string;
  dimension: string | null;
  citations: {
    id: string;
    quotedText: string;
    sourceTitle: string | null;
    isTraceable: boolean;
  }[];
}

export type CoachResult =
  | { ok: true; interactionId: string; items: CoachFeedbackItem[] }
  | { ok: false; error: string };

interface ActivityContext {
  allowsAi: boolean;
  allowedFunctions: AiFunction[];
  requiresAttemptBeforeAi: boolean;
  activityPrompt: string;
  stageTitle: string;
  stageFocus: string;
  caseTitle: string;
  caseBody: string;
  keyQuestion: string;
  rubricLines: string[];
}

async function loadActivityContext(
  activityId: string,
): Promise<ActivityContext | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("activities")
    .select(
      `prompt, allows_ai, allowed_ai_functions, requires_attempt_before_ai,
       rubrics(rubric_criteria(code, description, dimension)),
       learning_stages(
         title, focus,
         learning_units(cases(title, body, key_question))
       )`,
    )
    .eq("id", activityId)
    .maybeSingle();

  if (!data) return null;

  const caseDetail = data.learning_stages.learning_units.cases;

  return {
    allowsAi: data.allows_ai,
    allowedFunctions: (data.allowed_ai_functions ?? []) as AiFunction[],
    requiresAttemptBeforeAi: data.requires_attempt_before_ai,
    activityPrompt: data.prompt,
    stageTitle: data.learning_stages.title,
    stageFocus: data.learning_stages.focus,
    caseTitle: caseDetail?.title ?? "",
    caseBody: caseDetail?.body ?? "",
    keyQuestion: caseDetail?.key_question ?? "",
    rubricLines: (data.rubrics?.rubric_criteria ?? []).map(
      (criterion) =>
        `${criterion.code} (${criterion.dimension}): ${criterion.description}`,
    ),
  };
}

async function retrieveChunks(
  activityId: string,
  query: string,
): Promise<RetrievedChunk[]> {
  const supabase = await createClient();
  const provider = getProvider();

  const [embedding] = await provider.embed([query]);
  if (!embedding) return [];

  const { data, error } = await supabase.rpc("match_source_chunks", {
    p_activity_id: activityId,
    p_query: JSON.stringify(embedding),
    p_match_count: 6,
  });

  if (error || !data) return [];

  return data.map((row) => ({
    chunkId: row.chunk_id,
    sourceId: row.source_id,
    sourceVersionId: row.source_version_id,
    sourceTitle: row.source_title,
    content: row.content,
  }));
}

/** Template prompt hanya terbaca dosen dan admin, jadi dibaca lewat service role. */
async function resolvePromptTemplateId(fn: AiFunction): Promise<string | null> {
  const admin = createAdminClient();

  const { data } = await admin
    .from("ai_prompt_templates")
    .select("id")
    .eq("function", fn)
    .eq("is_active", true)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.id ?? null;
}

/**
 * Kutipan yang chunkId-nya tidak ada dalam potongan yang diberikan ditandai
 * `is_traceable = false` dan tetap disimpan agar terlihat, bukan disembunyikan
 * (LOCK-PED-005).
 */
function resolveCitations(
  item: AiResponseItem,
  chunks: RetrievedChunk[],
): {
  chunk: RetrievedChunk | null;
  quotedText: string;
}[] {
  return item.citations.map((citation) => ({
    chunk: chunks.find((c) => c.chunkId === citation.chunkId) ?? null,
    quotedText: citation.quotedText,
  }));
}

export async function requestCoachFeedback(
  request: CoachRequest,
): Promise<CoachResult> {
  const context = await loadActivityContext(request.activityId);
  if (!context) return { ok: false, error: "Aktivitas tidak ditemukan." };

  if (!context.allowsAi) {
    return { ok: false, error: "Aktivitas ini tidak mengizinkan bantuan AI." };
  }

  if (!context.allowedFunctions.includes(request.function)) {
    return {
      ok: false,
      error: "Fungsi AI tersebut tidak diizinkan pada aktivitas ini.",
    };
  }

  const supabase = await createClient();
  const { data: attempt } = await supabase
    .from("attempts")
    .select("content")
    .eq("id", request.attemptId)
    .eq("student_id", request.studentId)
    .eq("activity_id", request.activityId)
    .maybeSingle();

  if (!attempt) {
    return {
      ok: false,
      error:
        "Simpan respons awal Anda terlebih dahulu sebelum meminta bantuan AI.",
    };
  }

  const templateId = await resolvePromptTemplateId(request.function);
  if (!templateId) {
    return {
      ok: false,
      error: "Template prompt untuk fungsi ini belum tersedia.",
    };
  }

  const chunks = await retrieveChunks(
    request.activityId,
    buildRetrievalQuery(context.keyQuestion, attempt.content),
  );

  const prompt = buildPrompt({
    function: request.function,
    caseTitle: context.caseTitle,
    caseBody: context.caseBody,
    keyQuestion: context.keyQuestion,
    activityPrompt: context.activityPrompt,
    stageTitle: context.stageTitle,
    stageFocus: context.stageFocus,
    studentAnswer: attempt.content,
    rubricLines: context.rubricLines,
    chunks,
  });

  // Digest, bukan salinan mentah: cukup membuktikan prompt mana yang dipakai.
  const requestDigest = createHash("sha256").update(prompt).digest("hex");
  const admin = createAdminClient();

  const baseInteraction = {
    student_id: request.studentId,
    activity_id: request.activityId,
    attempt_id: request.attemptId,
    function: request.function,
    prompt_template_id: templateId,
    model: "gemini-3.5-flash-lite",
    purpose: `Bantuan ${request.function} pada tahap ${context.stageTitle}`,
    request_digest: requestDigest,
  };

  let generation;
  try {
    generation = await getProvider().generateStructured({
      systemInstruction: SYSTEM_INSTRUCTION,
      prompt,
      schema: providerResponseSchema as never,
    });
  } catch (error) {
    await admin.from("ai_interactions").insert({
      ...baseInteraction,
      status: "provider_error",
      error_code:
        error instanceof Error ? error.message.slice(0, 200) : "unknown",
    });
    return {
      ok: false,
      error:
        "Layanan AI sedang tidak dapat dihubungi. Coba lagi beberapa saat.",
    };
  }

  let parsed;
  try {
    parsed = aiResponseSchema.parse(JSON.parse(generation.text));
  } catch {
    await admin.from("ai_interactions").insert({
      ...baseInteraction,
      status: "schema_rejected",
      input_tokens: generation.inputTokens,
      output_tokens: generation.outputTokens,
      latency_ms: generation.latencyMs,
      error_code: "response_schema_invalid",
    });
    return {
      ok: false,
      error:
        "Keluaran AI tidak sesuai format yang diizinkan sehingga tidak ditampilkan. Silakan coba lagi.",
    };
  }

  const { data: interaction, error: interactionError } = await admin
    .from("ai_interactions")
    .insert({
      ...baseInteraction,
      status: "success",
      input_tokens: generation.inputTokens,
      output_tokens: generation.outputTokens,
      latency_ms: generation.latencyMs,
    })
    .select("id")
    .single();

  if (interactionError || !interaction) {
    return {
      ok: false,
      error: interactionError?.message.includes("tidak diizinkan")
        ? "Fungsi AI tersebut tidak diizinkan pada aktivitas ini."
        : "Interaksi AI gagal disimpan.",
    };
  }

  const items: CoachFeedbackItem[] = [];

  for (const item of parsed.items) {
    const { data: feedback, error: feedbackError } = await admin
      .from("ai_feedback")
      .insert({
        ai_interaction_id: interaction.id,
        kind: item.kind,
        title: item.title,
        body: item.body,
        dimension: item.dimension ?? null,
      })
      .select("id")
      .single();

    if (feedbackError || !feedback) continue;

    const citations: CoachFeedbackItem["citations"] = [];

    for (const resolved of resolveCitations(item, chunks)) {
      const { data: citation } = await admin
        .from("ai_citations")
        .insert({
          ai_feedback_id: feedback.id,
          source_id: resolved.chunk?.sourceId ?? null,
          source_version_id: resolved.chunk?.sourceVersionId ?? null,
          source_chunk_id: resolved.chunk?.chunkId ?? null,
          quoted_text: resolved.quotedText,
          is_traceable: resolved.chunk !== null,
        })
        .select("id")
        .single();

      if (!citation) continue;

      citations.push({
        id: citation.id,
        quotedText: resolved.quotedText,
        sourceTitle: resolved.chunk?.sourceTitle ?? null,
        isTraceable: resolved.chunk !== null,
      });
    }

    items.push({
      id: feedback.id,
      kind: item.kind,
      title: item.title,
      body: item.body,
      dimension: item.dimension ?? null,
      citations,
    });
  }

  return { ok: true, interactionId: interaction.id, items };
}
