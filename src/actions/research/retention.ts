/** @format */

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { toActionError } from "@/lib/errors";
import { validateRetentionRule } from "@/lib/research/consent";
import { requireRoleOrThrow } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export interface RetentionActionResult {
  ok?: boolean;
  error?: string;
}

const ruleSchema = z.object({
  organizationId: z.string().uuid("Organisasi tidak valid."),
  domainKey: z.string().min(1, "Domain harus dipilih."),
  retentionDays: z.coerce
    .number()
    .int()
    .min(1, "Masa simpan minimal 1 hari.")
    .max(3650, "Masa simpan maksimal 3650 hari."),
  action: z.enum(["anonymize", "delete"], {
    message: "Aksi retensi tidak valid.",
  }),
  isActive: z.boolean().default(true),
});

export async function saveRetentionRuleAction(
  input: unknown,
): Promise<RetentionActionResult> {
  try {
    await requireRoleOrThrow("admin");

    const parsed = ruleSchema.safeParse(input);
    if (!parsed.success) {
      return {
        error: parsed.error.issues[0]?.message ?? "Aturan tidak valid.",
      };
    }

    // Aksi hapus pada domain append-only akan selalu gagal di database; menolak
    // di sini mencegah aturan yang tampak berlaku padahal tidak pernah bisa.
    const validation = validateRetentionRule({
      domainKey: parsed.data.domainKey,
      retentionDays: parsed.data.retentionDays,
      action: parsed.data.action,
      isActive: parsed.data.isActive,
    });

    if (!validation.ok) {
      return { error: validation.error ?? "Aturan retensi tidak sah." };
    }

    const supabase = await createClient();

    const { error } = await supabase.from("data_retention_rules").upsert(
      {
        organization_id: parsed.data.organizationId,
        domain_key: parsed.data.domainKey,
        retention_days: parsed.data.retentionDays,
        action: parsed.data.action,
        is_active: parsed.data.isActive,
      },
      { onConflict: "organization_id,domain_key" },
    );

    if (error) {
      const result = toActionError(error);
      return result.ok ? {} : { error: result.error };
    }

    revalidatePath("/app/admin/retention");
    return { ok: true };
  } catch (error) {
    const result = toActionError(error);
    return result.ok ? {} : { error: result.error };
  }
}
