/** @format */

"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { headers } from "next/headers";

import { requestPasswordResetSchema } from "@/lib/validation/auth";

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

  const origin = (await headers()).get("origin") ?? "";

  // Alur implicit: token ikut di tautan, bukan disimpan sebagai cookie PKCE di
  // peramban peminta. Dengan begitu tautan dapat dibuka di perangkat lain.
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: "implicit",
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );

  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    { redirectTo: `${origin}/auth/callback?next=/reset-password` },
  );

  if (error) {
    console.error(
      `[auth] tautan atur ulang gagal dikirim ${JSON.stringify({
        status: error.status ?? null,
        code: error.code ?? null,
      })}`,
    );
  }

  // Selalu melaporkan keberhasilan, terlepas dari apakah surel terdaftar,
  // agar halaman ini tidak dapat dipakai menebak akun.
  return { success: true };
}
