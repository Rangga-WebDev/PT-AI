/** @format */

"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { describePasswordUpdateError } from "@/lib/auth/password-reset";
import { getCurrentUser, landingPathForRoles } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { changePasswordSchema } from "@/lib/validation/auth";
import { clearPasswordChangeRequirement } from "@/server/services/password-reset";

import type { AuthFormState } from "./sign-in";

export interface ChangePasswordState extends AuthFormState {
  success?: boolean;
}

/** Memeriksa kata sandi lama lewat klien terpisah agar sesi aktif tidak tersentuh. */
async function verifyCurrentPassword(
  email: string,
  password: string,
): Promise<boolean> {
  const verifier = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { error } = await verifier.auth.signInWithPassword({ email, password });
  if (error) return false;
  await verifier.auth.signOut({ scope: "local" });
  return true;
}

export async function changePassword(
  _prevState: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword") ?? "",
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  // Kata sandi sementara baru saja dipakai masuk, jadi tidak ditanyakan ulang.
  if (!user.mustChangePassword) {
    if (!parsed.data.currentPassword) {
      return {
        fieldErrors: { currentPassword: ["Kata sandi saat ini wajib diisi."] },
      };
    }
    if (
      !(await verifyCurrentPassword(user.email, parsed.data.currentPassword))
    ) {
      return { fieldErrors: { currentPassword: ["Kata sandi saat ini salah."] } };
    }
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) return { error: describePasswordUpdateError(error.code) };

  if (user.mustChangePassword) {
    await clearPasswordChangeRequirement(user.id);
    revalidatePath("/", "layout");
    redirect(landingPathForRoles(user.roles));
  }

  return { success: true };
}
