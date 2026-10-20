/** @format */

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ChangePasswordForm } from "@/features/auth/components/change-password-form";
import { getCurrentUser, landingPathForRoles } from "@/lib/supabase/auth";

export const metadata: Metadata = {
  title: "Ganti kata sandi",
};

// Sengaja tidak memakai requireUser(): halaman inilah tujuan pengalihannya.
export default async function ChangePasswordPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col gap-2 text-center">
          <h1 className="font-heading text-h2 font-semibold">
            {user.mustChangePassword ? "Buat kata sandi baru" : "Ganti kata sandi"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {user.mustChangePassword
              ? "Kata sandi Anda baru diatur ulang oleh dosen atau administrator. Buat kata sandi pribadi sebelum melanjutkan."
              : "Gunakan kata sandi minimal 12 karakter yang tidak Anda pakai di layanan lain."}
          </p>
        </div>

        <div className="flex flex-col gap-5 rounded-xl border border-border bg-card p-6">
          <ChangePasswordForm requireCurrent={!user.mustChangePassword} />
          {user.mustChangePassword ? null : (
            <Link
              href={landingPathForRoles(user.roles)}
              className="text-center text-sm text-primary underline-offset-4 hover:underline"
            >
              Kembali ke beranda
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
