/** @format */

import "server-only";

import {
  quickSetupDraftSchema,
  quickSetupProviderSchema,
  type QuickSetupDocumentType,
  type QuickSetupDraft,
} from "@/lib/ai/quick-setup-schema";
import { createClient } from "@/lib/supabase/server";
import { requireLecturerOfClass } from "@/lib/supabase/auth";

import { getProvider, CHAT_MODEL } from "./provider";
import {
  buildQuickSetupPrompt,
  QUICK_SETUP_PROMPT_VERSION,
  QUICK_SETUP_SYSTEM_INSTRUCTION,
} from "./quick-setup-prompt";

export type QuickSetupFailure =
  | "forbidden"
  | "resource_not_found"
  | "extraction_pending"
  | "extraction_failed"
  | "provider_error"
  | "invalid_output"
  | "unknown";

export const QUICK_SETUP_MESSAGE: Record<QuickSetupFailure, string> = {
  forbidden: "Anda tidak berwenang atas kelas atau dokumen ini.",
  resource_not_found: "Dokumen tidak ditemukan pada kelas ini.",
  extraction_pending:
    "Dokumen belum dapat dibaca. Tunggu proses ekstraksi selesai terlebih dahulu.",
  extraction_failed:
    "Dokumen belum dapat dibaca. Perbaiki proses ekstraksi terlebih dahulu.",
  provider_error:
    "Layanan AI sedang tidak dapat dihubungi. Coba lagi beberapa saat.",
  invalid_output:
    "Keluaran AI tidak sesuai format yang diizinkan sehingga tidak disimpan. Silakan coba lagi.",
  unknown: "Terjadi kesalahan yang tidak terduga. Silakan coba lagi.",
};

export interface QuickSetupRequest {
  classId: string;
  resourceId: string;
  documentType: QuickSetupDocumentType;
  instruction?: string | undefined;
}

export interface QuickSetupProvenance {
  resourceId: string;
  resourceTitle: string;
  checksum: string | null;
  extractedAt: string | null;
  documentType: QuickSetupDocumentType;
  instruction: string | null;
  model: string;
  promptVersion: number;
  truncated: boolean;
}

export type QuickSetupGeneration =
  | { ok: true; draft: QuickSetupDraft; provenance: QuickSetupProvenance }
  | { ok: false; reason: QuickSetupFailure };

/**
 * Hubungan dokumen dengan kelas tidak pernah dipercaya dari klien: barisnya
 * dibaca ulang memakai sesi dosen, sehingga RLS yang memutuskan apakah dokumen
 * itu memang miliknya. Baris yang tidak terlihat berarti tidak berhak.
 */
async function loadReadableSource(request: QuickSetupRequest) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("learning_resources")
    .select(
      "id, class_id, title, checksum, extraction_status, extracted_text, extracted_at",
    )
    .eq("id", request.resourceId)
    .eq("class_id", request.classId)
    .is("deleted_at", null)
    .maybeSingle();

  return data;
}

export async function generateQuickSetupDraft(
  request: QuickSetupRequest,
): Promise<QuickSetupGeneration> {
  try {
    await requireLecturerOfClass(request.classId);
  } catch {
    return { ok: false, reason: "forbidden" };
  }

  const source = await loadReadableSource(request);
  if (!source) return { ok: false, reason: "resource_not_found" };

  // Syarat mutlak: AI hanya boleh membaca isi yang benar-benar pernah terbaca.
  // Mengirim nama berkas saja lalu menyebutnya "membaca dokumen" adalah bohong.
  if (source.extraction_status !== "succeeded" || !source.extracted_text) {
    return {
      ok: false,
      reason:
        source.extraction_status === "pending"
          ? "extraction_pending"
          : "extraction_failed",
    };
  }

  const supabase = await createClient();
  const { data: classItem } = await supabase
    .from("classes")
    .select("name, courses(name)")
    .eq("id", request.classId)
    .maybeSingle();

  const { prompt, truncated } = buildQuickSetupPrompt({
    documentType: request.documentType,
    documentTitle: source.title,
    documentText: source.extracted_text,
    lecturerInstruction: request.instruction ?? null,
    courseName: classItem?.courses?.name ?? "—",
    className: classItem?.name ?? "—",
  });

  let generation;
  try {
    generation = await getProvider().generateStructured({
      systemInstruction: QUICK_SETUP_SYSTEM_INSTRUCTION,
      prompt,
      schema: quickSetupProviderSchema as never,
    });
  } catch (error) {
    console.error("[ai] quick-setup provider", {
      at: new Date().toISOString(),
      resourceId: request.resourceId,
      message: error instanceof Error ? error.message : "unknown",
    });
    return { ok: false, reason: "provider_error" };
  }

  const parsed = safeParseGeneration(generation.text);
  if (!parsed) return { ok: false, reason: "invalid_output" };

  return {
    ok: true,
    draft: parsed,
    provenance: {
      resourceId: source.id,
      resourceTitle: source.title,
      checksum: source.checksum,
      extractedAt: source.extracted_at,
      documentType: request.documentType,
      instruction: request.instruction?.trim() || null,
      model: CHAT_MODEL,
      promptVersion: QUICK_SETUP_PROMPT_VERSION,
      truncated,
    },
  };
}

/** JSON rusak dan JSON yang tidak lolos skema diperlakukan sama: ditolak. */
function safeParseGeneration(text: string): QuickSetupDraft | null {
  try {
    const result = quickSetupDraftSchema.safeParse(JSON.parse(text));
    if (!result.success) {
      console.error("[ai] quick-setup schema", {
        at: new Date().toISOString(),
        issues: result.error.issues.slice(0, 5),
      });
      return null;
    }
    return result.data;
  } catch {
    console.error("[ai] quick-setup json", {
      at: new Date().toISOString(),
      reason: "response_not_json",
    });
    return null;
  }
}
