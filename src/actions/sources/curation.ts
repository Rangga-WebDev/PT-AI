/** @format */

"use server";

import { revalidatePath } from "next/cache";

import { toActionError } from "@/lib/errors";
import {
  requireLecturerOfClass,
  requireRoleOrThrow,
} from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import {
  caseClaimSchema,
  caseSourceSchema,
  sourceSchema,
  sourceVersionSchema,
} from "@/lib/validation/sources";
import { isUniqueViolation } from "@/server/repositories/shared";

import type { FormState } from "@/actions/administration/accounts";

function fail(error: unknown): FormState {
  if (isUniqueViolation(error)) {
    return { error: "Data tersebut sudah ada. Muat ulang lalu coba lagi." };
  }
  const result = toActionError(error);
  return result.ok ? {} : { error: result.error };
}

async function classOfCase(caseId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("cases")
    .select("learning_units(modules(class_id))")
    .eq("id", caseId)
    .maybeSingle();
  return data?.learning_units.modules.class_id ?? null;
}

export async function createSourceAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const lecturer = await requireRoleOrThrow("lecturer");

    const parsed = sourceSchema.safeParse({
      title: formData.get("title"),
      authors: formData.get("authors") ?? undefined,
      publisher: formData.get("publisher") ?? undefined,
      sourceType: formData.get("sourceType"),
      publishedAt: formData.get("publishedAt") ?? undefined,
      url: formData.get("url") ?? undefined,
      curationNote: formData.get("curationNote") ?? undefined,
    });

    if (!parsed.success) {
      return { fieldErrors: parsed.error.flatten().fieldErrors };
    }

    const supabase = await createClient();
    const { error } = await supabase.from("sources").insert({
      organization_id: lecturer.organizationId,
      title: parsed.data.title,
      authors: parsed.data.authors ?? null,
      publisher: parsed.data.publisher ?? null,
      source_type: parsed.data.sourceType,
      published_at: parsed.data.publishedAt || null,
      url: parsed.data.url || null,
      curation_note: parsed.data.curationNote ?? null,
      created_by: lecturer.id,
    });

    if (error) return fail(error);

    revalidatePath("/app/lecturer/sources");
    return { ok: true, message: "Sumber berhasil ditambahkan." };
  } catch (error) {
    return fail(error);
  }
}

export async function createSourceVersionAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const lecturer = await requireRoleOrThrow("lecturer");

    const parsed = sourceVersionSchema.safeParse({
      sourceId: formData.get("sourceId"),
      versionLabel: formData.get("versionLabel"),
      retrievedAt: formData.get("retrievedAt"),
      contentText: formData.get("contentText"),
      notes: formData.get("notes") ?? undefined,
    });

    if (!parsed.success) {
      return { fieldErrors: parsed.error.flatten().fieldErrors };
    }

    const supabase = await createClient();
    const { error } = await supabase.from("source_versions").insert({
      source_id: parsed.data.sourceId,
      version_label: parsed.data.versionLabel,
      retrieved_at: new Date(parsed.data.retrievedAt).toISOString(),
      content_text: parsed.data.contentText,
      notes: parsed.data.notes ?? null,
      created_by: lecturer.id,
    });

    if (error) return fail(error);

    revalidatePath("/app/lecturer/sources");
    return { ok: true, message: "Versi sumber berhasil ditambahkan." };
  } catch (error) {
    return fail(error);
  }
}

export async function attachSourceToCaseAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const parsed = caseSourceSchema.safeParse({
      caseId: formData.get("caseId"),
      sourceId: formData.get("sourceId"),
      isRequired: formData.get("isRequired") !== "false",
    });

    if (!parsed.success) {
      return { fieldErrors: parsed.error.flatten().fieldErrors };
    }

    const classId = await classOfCase(parsed.data.caseId);
    if (!classId) return { error: "Kasus tidak ditemukan." };

    await requireLecturerOfClass(classId);
    const supabase = await createClient();

    const { data: last } = await supabase
      .from("case_sources")
      .select("sequence")
      .eq("case_id", parsed.data.caseId)
      .order("sequence", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { error } = await supabase.from("case_sources").insert({
      case_id: parsed.data.caseId,
      source_id: parsed.data.sourceId,
      is_required: parsed.data.isRequired,
      sequence: (last?.sequence ?? 0) + 1,
    });

    if (error) return fail(error);

    revalidatePath("/app/lecturer/classes", "layout");
    return { ok: true, message: "Sumber dilampirkan ke kasus." };
  } catch (error) {
    return fail(error);
  }
}

export async function createCaseClaimAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const parsed = caseClaimSchema.safeParse({
      caseId: formData.get("caseId"),
      text: formData.get("text"),
    });

    if (!parsed.success) {
      return { fieldErrors: parsed.error.flatten().fieldErrors };
    }

    const classId = await classOfCase(parsed.data.caseId);
    if (!classId) return { error: "Kasus tidak ditemukan." };

    const lecturer = await requireLecturerOfClass(classId);
    const supabase = await createClient();

    const { error } = await supabase.from("claims").insert({
      case_id: parsed.data.caseId,
      origin: "case",
      text: parsed.data.text,
      author_id: lecturer.id,
    });

    if (error) return fail(error);

    revalidatePath("/app/lecturer/classes", "layout");
    return { ok: true, message: "Klaim kasus ditambahkan." };
  } catch (error) {
    return fail(error);
  }
}
