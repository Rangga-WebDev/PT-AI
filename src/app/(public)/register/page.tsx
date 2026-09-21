/** @format */

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthScreen } from "@/features/auth/components/auth-screen";
import { RegisterStudentForm } from "@/features/auth/components/register-student-form";
import { getCurrentUser, landingPathForRoles } from "@/lib/supabase/auth";
import { registrationConfigured } from "@/server/services/student-registration";

export const metadata: Metadata = { title: "Daftar mahasiswa" };

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect(landingPathForRoles(user.roles));
  return (
    <AuthScreen>
      <RegisterStudentForm available={registrationConfigured()} />
    </AuthScreen>
  );
}
