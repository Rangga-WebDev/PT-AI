/** @format */

"use server";

import { revalidatePath } from "next/cache";

import { toActionError, type ActionResult } from "@/lib/errors";
import { requireAdminAccess } from "@/lib/supabase/auth";
import {
  accountSchema,
  roleAssignmentSchema,
} from "@/lib/validation/academics";
import {
  createAccount,
  grantRole,
  revokeRole,
} from "@/server/services/account-service";

export interface FormState {
  ok?: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

export async function createAccountAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const admin = await requireAdminAccess();

    const parsed = accountSchema.safeParse({
      email: formData.get("email"),
      fullName: formData.get("fullName"),
      identifier: formData.get("identifier"),
      role: formData.get("role"),
      studyProgramId: formData.get("studyProgramId") ?? "",
    });

    if (!parsed.success) {
      return { fieldErrors: parsed.error.flatten().fieldErrors };
    }

    const studyProgramId = parsed.data.studyProgramId || undefined;

    const result = await createAccount({
      actorId: admin.id,
      organizationId: admin.organizationId,
      email: parsed.data.email,
      fullName: parsed.data.fullName,
      identifier: parsed.data.identifier,
      role: parsed.data.role,
      ...(studyProgramId ? { studyProgramId } : {}),
    });

    revalidatePath("/app/admin/users");

    return {
      ok: true,
      // Ditampilkan sekali kepada administrator untuk diteruskan ke pengguna.
      message: `Akun dibuat. Kata sandi sementara: ${result.temporaryPassword}`,
    };
  } catch (error) {
    return toResultState(toActionError(error));
  }
}

export async function grantRoleAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const admin = await requireAdminAccess();

    const parsed = roleAssignmentSchema.safeParse({
      profileId: formData.get("profileId"),
      role: formData.get("role"),
    });

    if (!parsed.success) {
      return { fieldErrors: parsed.error.flatten().fieldErrors };
    }

    await grantRole(
      admin.id,
      admin.organizationId,
      parsed.data.profileId,
      parsed.data.role,
    );

    revalidatePath("/app/admin/users");
    return { ok: true, message: "Peran berhasil diberikan." };
  } catch (error) {
    return toResultState(toActionError(error));
  }
}

export async function revokeRoleAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const admin = await requireAdminAccess();

    const parsed = roleAssignmentSchema.safeParse({
      profileId: formData.get("profileId"),
      role: formData.get("role"),
    });

    if (!parsed.success) {
      return { fieldErrors: parsed.error.flatten().fieldErrors };
    }

    if (parsed.data.profileId === admin.id && parsed.data.role === "admin") {
      return {
        error: "Anda tidak dapat mencabut peran administrator milik sendiri.",
      };
    }

    await revokeRole(admin.id, parsed.data.profileId, parsed.data.role);

    revalidatePath("/app/admin/users");
    return { ok: true, message: "Peran berhasil dicabut." };
  } catch (error) {
    return toResultState(toActionError(error));
  }
}

function toResultState(result: ActionResult<never>): FormState {
  return result.ok ? {} : { error: result.error };
}
