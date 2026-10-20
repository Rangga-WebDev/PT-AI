/** @format */

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { describePasswordUpdateError } from "@/lib/auth/password-reset";
import { updatePasswordSchema } from "@/lib/validation/auth";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, landingPathForRoles } from "@/lib/supabase/auth";
import { clearPasswordChangeRequirement } from "@/server/services/password-reset";

import type { AuthFormState } from "./sign-in";

export async function updatePassword(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = updatePasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const user = await getCurrentUser();

  if (!user) {
    return {
      error:
        "Tautan pengaturan ulang tidak berlaku lagi. Silakan minta tautan baru.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { error: describePasswordUpdateError(error.code) };
  }

  if (user.mustChangePassword) await clearPasswordChangeRequirement(user.id);

  revalidatePath("/", "layout");
  redirect(landingPathForRoles(user.roles));
}
