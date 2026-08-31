/** @format */

"use server";

import { revalidatePath } from "next/cache";

import { AuthorizationError, toActionError } from "@/lib/errors";
import {
  requireLecturerOfClass,
  requireUserOrThrow,
} from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import {
  createLinkMaterialSchema,
  createNoteMaterialSchema,
  materialIdSchema,
  materialPublicationSchema,
  updateMaterialSchema,
} from "@/lib/validation/materials";
import { nextMaterialSequence } from "@/server/repositories/materials";
import {
  createMaterialDownloadUrl,
  type SignedMaterialDownload,
} from "@/server/services/material-storage";
import { uploadClassMaterial } from "@/server/services/material-upload";

import type { FormState } from "@/actions/administration/accounts";

function fail(error: unknown): FormState {
  const result = toActionError(error);
  return result.ok ? {} : { error: result.error };
}

function revalidateMaterials(classId: string): void {
  revalidatePath(`/app/lecturer/classes/${classId}/materials`);
  revalidatePath(`/app/student/classes/${classId}`);
}

/**
 * Subfase ini mengelola bahan tingkat kelas. Bahan yang melekat pada unit atau
 * aktivitas dikelola perancang konten, sehingga sengaja tidak dapat disunting
 * dari jalur ini — bukan karena lupa, melainkan agar kepemilikannya tunggal.
 */
async function requireOwnedClassMaterial(materialId: string): Promise<string> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("learning_resources")
    .select("class_id")
    .eq("id", materialId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!data?.class_id) throw new AuthorizationError();

  await requireLecturerOfClass(data.class_id);
  return data.class_id;
}

export async function createLinkMaterialAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const parsed = createLinkMaterialSchema.safeParse({
      classId: formData.get("classId"),
      title: formData.get("title"),
      description: formData.get("description") ?? undefined,
      materialKind: formData.get("materialKind"),
      visibility: formData.get("visibility") ?? "student",
      resourceType: formData.get("resourceType") ?? "link",
      url: formData.get("url"),
    });

    if (!parsed.success) {
      return { fieldErrors: parsed.error.flatten().fieldErrors };
    }

    const lecturer = await requireLecturerOfClass(parsed.data.classId);
    const supabase = await createClient();

    const { error } = await supabase.from("learning_resources").insert({
      class_id: parsed.data.classId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      resource_type: parsed.data.resourceType,
      material_kind: parsed.data.materialKind,
      visibility: parsed.data.visibility,
      url: parsed.data.url,
      sequence: await nextMaterialSequence(parsed.data.classId),
      created_by: lecturer.id,
    });

    if (error) return fail(error);

    revalidateMaterials(parsed.data.classId);
    return { ok: true, message: "Tautan bahan ajar berhasil ditambahkan." };
  } catch (error) {
    return fail(error);
  }
}

const NOTE_REJECTION: Record<string, string> = {
  unauthenticated: "Anda perlu masuk terlebih dahulu.",
  forbidden: "Anda bukan pengampu kelas ini.",
};

export async function createNoteMaterialAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const parsed = createNoteMaterialSchema.safeParse({
      classId: formData.get("classId"),
      title: formData.get("title"),
      description: formData.get("description") ?? undefined,
      materialKind: formData.get("materialKind"),
      visibility: formData.get("visibility") ?? "student",
      content: formData.get("content"),
    });

    if (!parsed.success) {
      return { fieldErrors: parsed.error.flatten().fieldErrors };
    }

    const { content, ...fields } = parsed.data;

    const outcome = await uploadClassMaterial({
      fields,
      file: {
        name: `${parsed.data.title}.md`,
        type: "text/markdown",
        bytes: new TextEncoder().encode(content),
      },
      resourceType: "note",
    });

    if (!outcome.ok) {
      return { error: NOTE_REJECTION[outcome.reason] ?? outcome.error };
    }

    revalidateMaterials(parsed.data.classId);
    return { ok: true, message: "Materi tulisan berhasil disimpan." };
  } catch (error) {
    return fail(error);
  }
}

export async function updateMaterialAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const parsed = updateMaterialSchema.safeParse({
      id: formData.get("id"),
      title: formData.get("title"),
      description: formData.get("description") ?? undefined,
      materialKind: formData.get("materialKind"),
      visibility: formData.get("visibility") ?? "student",
    });

    if (!parsed.success) {
      return { fieldErrors: parsed.error.flatten().fieldErrors };
    }

    const classId = await requireOwnedClassMaterial(parsed.data.id);
    const supabase = await createClient();

    const { error } = await supabase
      .from("learning_resources")
      .update({
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        material_kind: parsed.data.materialKind,
        visibility: parsed.data.visibility,
      })
      .eq("id", parsed.data.id);

    if (error) return fail(error);

    revalidateMaterials(classId);
    return { ok: true, message: "Bahan ajar berhasil diperbarui." };
  } catch (error) {
    return fail(error);
  }
}

export async function setMaterialPublicationAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const parsed = materialPublicationSchema.safeParse({
      id: formData.get("id"),
      status: formData.get("status"),
    });

    if (!parsed.success) {
      return { fieldErrors: parsed.error.flatten().fieldErrors };
    }

    const classId = await requireOwnedClassMaterial(parsed.data.id);
    const supabase = await createClient();

    const { error } = await supabase
      .from("learning_resources")
      .update({ status: parsed.data.status })
      .eq("id", parsed.data.id);

    if (error) return fail(error);

    revalidateMaterials(classId);
    return {
      ok: true,
      message:
        parsed.data.status === "published"
          ? "Bahan ajar terbit dan dapat dilihat mahasiswa."
          : "Bahan ajar ditarik dari tampilan mahasiswa.",
    };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteMaterialAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const parsed = materialIdSchema.safeParse({ id: formData.get("id") });

    if (!parsed.success) {
      return { fieldErrors: parsed.error.flatten().fieldErrors };
    }

    const classId = await requireOwnedClassMaterial(parsed.data.id);
    const supabase = await createClient();

    // Soft delete: berkasnya dipertahankan agar penarikan yang keliru tidak
    // menghancurkan bahan yang mungkin sudah dirujuk.
    const { error } = await supabase
      .from("learning_resources")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", parsed.data.id);

    if (error) return fail(error);

    revalidateMaterials(classId);
    return { ok: true, message: "Bahan ajar dicabut." };
  } catch (error) {
    return fail(error);
  }
}

export type DownloadState =
  | { ok: true; download: SignedMaterialDownload }
  | { ok: false; error: string };

/**
 * Mahasiswa juga memakai aksi ini. Tidak ada pemeriksaan peran di sini karena
 * yang berwenang memutuskan adalah RLS pada pembacaan barisnya.
 */
export async function requestMaterialDownloadAction(
  materialId: string,
): Promise<DownloadState> {
  try {
    await requireUserOrThrow();

    const parsed = materialIdSchema.safeParse({ id: materialId });
    if (!parsed.success) {
      return { ok: false, error: "Bahan tidak valid." };
    }

    return {
      ok: true,
      download: await createMaterialDownloadUrl(parsed.data.id),
    };
  } catch (error) {
    const result = toActionError(error);
    return {
      ok: false,
      error: result.ok ? "Tautan gagal dibuat." : result.error,
    };
  }
}
