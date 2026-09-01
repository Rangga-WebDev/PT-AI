/** @format */

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  quickSetupDraftSchema,
  QUICK_SETUP_DOCUMENT_TYPES,
} from "@/lib/ai/quick-setup-schema";
import { toActionError } from "@/lib/errors";
import { requireLecturerOfClass } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import {
  generateQuickSetupDraft,
  QUICK_SETUP_MESSAGE,
} from "@/server/ai/quick-setup";

import type { FormState } from "@/actions/administration/accounts";

const generateSchema = z.object({
  classId: z.string().uuid("Kelas tidak valid."),
  resourceId: z.string().uuid("Dokumen tidak valid."),
  documentType: z.enum(QUICK_SETUP_DOCUMENT_TYPES, {
    message: "Jenis dokumen tidak dikenal.",
  }),
  instruction: z.string().trim().max(1000).optional(),
});

const draftIdSchema = z.object({
  draftId: z.string().uuid("Draf tidak valid."),
  classId: z.string().uuid("Kelas tidak valid."),
});

function revalidateQuickSetup(classId: string): void {
  revalidatePath(`/app/lecturer/classes/${classId}/quick-setup`);
}

function fail(error: unknown): FormState {
  const result = toActionError(error);
  return result.ok ? {} : { error: result.error };
}

export async function generateQuickSetupDraftAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const parsed = generateSchema.safeParse({
      classId: formData.get("classId"),
      resourceId: formData.get("resourceId"),
      documentType: formData.get("documentType"),
      instruction: formData.get("instruction") ?? undefined,
    });

    if (!parsed.success) {
      return { fieldErrors: parsed.error.flatten().fieldErrors };
    }

    const lecturer = await requireLecturerOfClass(parsed.data.classId);

    const generation = await generateQuickSetupDraft({
      classId: parsed.data.classId,
      resourceId: parsed.data.resourceId,
      documentType: parsed.data.documentType,
      instruction: parsed.data.instruction,
    });

    if (!generation.ok) {
      return { error: QUICK_SETUP_MESSAGE[generation.reason] };
    }

    const supabase = await createClient();
    const { provenance } = generation;

    // Provenance disimpan bersama permintaannya: checksum dan waktu ekstraksi
    // membuktikan salinan dokumen mana yang dibaca AI, bukan sekadar mana
    // dokumennya.
    const { error } = await supabase.from("ai_material_drafts").insert({
      class_id: parsed.data.classId,
      requested_by: lecturer.id,
      source_resource_id: provenance.resourceId,
      grounding: "source_bound",
      instruction: {
        documentType: provenance.documentType,
        instruction: provenance.instruction,
        resourceTitle: provenance.resourceTitle,
        checksum: provenance.checksum,
        extractedAt: provenance.extractedAt,
        truncated: provenance.truncated,
      },
      output: JSON.stringify(generation.draft),
      model: provenance.model,
      prompt_version: provenance.promptVersion,
    });

    if (error) return fail(error);

    revalidateQuickSetup(parsed.data.classId);
    return {
      ok: true,
      message:
        "Draf tersusun. Tinjau sebelum dipakai — belum diterapkan ke kelas.",
    };
  } catch (error) {
    return fail(error);
  }
}

export async function updateQuickSetupDraftAction(input: {
  draftId: string;
  classId: string;
  draft: unknown;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const identity = draftIdSchema.safeParse(input);
    if (!identity.success) {
      return { ok: false, error: "Draf tidak valid." };
    }

    await requireLecturerOfClass(identity.data.classId);

    // Suntingan dosen melewati skema yang sama dengan keluaran AI; tidak ada
    // jalur yang menyimpan bentuk lain.
    const parsed = quickSetupDraftSchema.safeParse(input.draft);
    if (!parsed.success) {
      return { ok: false, error: "Perubahan tidak sesuai format draf." };
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("ai_material_drafts")
      .update({ output: JSON.stringify(parsed.data) })
      .eq("id", identity.data.draftId)
      .eq("status", "draft");

    if (error) {
      const mapped = toActionError(error);
      return {
        ok: false,
        error: mapped.ok ? "Gagal menyimpan." : mapped.error,
      };
    }

    revalidateQuickSetup(identity.data.classId);
    return { ok: true };
  } catch (error) {
    const mapped = toActionError(error);
    return { ok: false, error: mapped.ok ? "Gagal menyimpan." : mapped.error };
  }
}

async function setDraftStatus(
  formData: FormData,
  status: "approved" | "discarded",
  message: string,
): Promise<FormState> {
  try {
    const parsed = draftIdSchema.safeParse({
      draftId: formData.get("draftId"),
      classId: formData.get("classId"),
    });

    if (!parsed.success) {
      return { fieldErrors: parsed.error.flatten().fieldErrors };
    }

    const lecturer = await requireLecturerOfClass(parsed.data.classId);
    const supabase = await createClient();

    const patch =
      status === "approved"
        ? {
            status,
            approved_by: lecturer.id,
            approved_at: new Date().toISOString(),
          }
        : { status };

    const { error } = await supabase
      .from("ai_material_drafts")
      .update(patch)
      .eq("id", parsed.data.draftId);

    if (error) return fail(error);

    revalidateQuickSetup(parsed.data.classId);
    return { ok: true, message };
  } catch (error) {
    return fail(error);
  }
}

/**
 * Menyetujui berarti "inilah yang saya baca dan saya terima". Draf menjadi
 * beku, tetapi tidak satu baris pun struktur kelas dibuat: penerapan ke kelas
 * adalah keputusan terpisah yang belum ada pada subfase ini.
 */
export async function approveQuickSetupDraftAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  return setDraftStatus(
    formData,
    "approved",
    "Draf disetujui. Penerapan ke struktur kelas belum dilakukan.",
  );
}

export async function discardQuickSetupDraftAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  return setDraftStatus(formData, "discarded", "Draf dibuang.");
}
