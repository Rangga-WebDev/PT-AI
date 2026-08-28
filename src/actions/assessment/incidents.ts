/** @format */

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { toActionError } from "@/lib/errors";
import { requireRoleOrThrow } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { FIDELITY_CHECKLIST } from "@/lib/analytics/aggregate";

export interface IncidentActionResult {
  ok?: boolean;
  error?: string;
}

const resolveSchema = z.object({
  incidentId: z.string().uuid("Insiden tidak valid."),
  status: z.enum(["reviewing", "resolved", "dismissed"], {
    message: "Status insiden tidak valid.",
  }),
  resolutionNote: z
    .string()
    .trim()
    .min(10, "Catatan penyelesaian minimal 10 karakter.")
    .max(2000, "Catatan penyelesaian terlalu panjang."),
});

const fidelitySchema = z.object({
  classId: z.string().uuid("Kelas tidak valid."),
  checklistKey: z.string().min(1),
  isImplemented: z.boolean(),
  observationDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid."),
  note: z.string().trim().max(1000).optional().or(z.literal("")),
});

function fail(error: unknown): IncidentActionResult {
  const result = toActionError(error);
  return result.ok ? {} : { error: result.error };
}

/**
 * Laporan mahasiswa atas perilaku AI ditutup dosen kelas terkait, bukan admin:
 * penilaian atas kualitas bantuan AI adalah penilaian akademik (SEC-005).
 */
export async function resolveAiIncidentAction(
  input: unknown,
): Promise<IncidentActionResult> {
  try {
    const lecturer = await requireRoleOrThrow("lecturer");

    const parsed = resolveSchema.safeParse(input);
    if (!parsed.success) {
      return {
        error: parsed.error.issues[0]?.message ?? "Data insiden tidak valid.",
      };
    }

    const supabase = await createClient();

    const { data: updated, error } = await supabase
      .from("ai_incidents")
      .update({
        status: parsed.data.status,
        resolution_note: parsed.data.resolutionNote,
        handled_by: lecturer.id,
        handled_at: new Date().toISOString(),
      })
      .eq("id", parsed.data.incidentId)
      .select("id");

    if (error) return fail(error);

    // RLS mengembalikan nol baris bila dosen bukan pengampu kelas insiden itu.
    if (!updated || updated.length === 0) {
      return { error: "Insiden ini bukan pada kelas yang Anda ampu." };
    }

    revalidatePath("/app/lecturer/incidents");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function recordFidelityAction(
  input: unknown,
): Promise<IncidentActionResult> {
  try {
    const lecturer = await requireRoleOrThrow("lecturer");

    const parsed = fidelitySchema.safeParse(input);
    if (!parsed.success) {
      return {
        error: parsed.error.issues[0]?.message ?? "Data checklist tidak valid.",
      };
    }

    if (
      !FIDELITY_CHECKLIST.some((item) => item.key === parsed.data.checklistKey)
    ) {
      return { error: "Butir checklist tidak dikenal." };
    }

    const supabase = await createClient();

    const { error } = await supabase.from("fidelity_records").upsert(
      {
        class_id: parsed.data.classId,
        checklist_key: parsed.data.checklistKey,
        observed_by: lecturer.id,
        observation_date: parsed.data.observationDate,
        is_implemented: parsed.data.isImplemented,
        note: parsed.data.note || null,
      },
      { onConflict: "class_id,checklist_key,observation_date" },
    );

    if (error) return fail(error);

    revalidatePath(`/app/lecturer/classes/${parsed.data.classId}/analytics`);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}
