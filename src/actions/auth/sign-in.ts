/** @format */

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { signInSchema } from "@/lib/validation/auth";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, landingPathForRoles } from "@/lib/supabase/auth";

export interface AuthFormState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

// Mencegah open redirect: hanya menerima path internal di area aplikasi.
function safeRedirectTarget(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith("/app") || value.startsWith("//")) return null;
  return value;
}

export async function signIn(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    // Rate limit bukan informasi sensitif; menyamarkannya sebagai "kata sandi
    // salah" membuat pengguna mengira kredensialnya keliru.
    if (error.status === 429) {
      return {
        error:
          "Terlalu banyak percobaan masuk. Tunggu beberapa saat lalu coba lagi.",
      };
    }

    // Selain itu pesan sengaja generik agar tidak membocorkan surel mana yang
    // terdaftar.
    return { error: "Surel atau kata sandi salah." };
  }

  const user = await getCurrentUser();

  if (!user) {
    await supabase.auth.signOut();
    return {
      error:
        "Akun Anda belum aktif atau belum memiliki profil. Hubungi administrator.",
    };
  }

  revalidatePath("/", "layout");
  redirect(
    safeRedirectTarget(formData.get("redirectTo")) ??
      landingPathForRoles(user.roles),
  );
}
