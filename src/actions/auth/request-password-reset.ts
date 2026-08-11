/** @format */

"use server";

import { headers } from "next/headers";

import { requestPasswordResetSchema } from "@/lib/validation/auth";
import { createClient } from "@/lib/supabase/server";

import type { AuthFormState } from "./sign-in";

export interface ResetRequestState extends AuthFormState {
  success?: boolean;
}

export async function requestPasswordReset(
  _prevState: ResetRequestState,
  formData: FormData,
): Promise<ResetRequestState> {
  const parsed = requestPasswordResetSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const origin = (await headers()).get("origin") ?? "";

  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  // Selalu melaporkan keberhasilan, terlepas dari apakah surel terdaftar,
  // agar halaman ini tidak dapat dipakai menebak akun.
  return { success: true };
}
