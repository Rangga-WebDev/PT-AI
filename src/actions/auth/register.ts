/** @format */

"use server";

import { headers } from "next/headers";
import type { AuthFormState } from "@/actions/auth/sign-in";
import { getCurrentUser } from "@/lib/supabase/auth";
import {
  registerStudent,
  registrationClientIp,
} from "@/server/services/student-registration";

export interface RegistrationFormState extends AuthFormState {
  ok?: boolean;
}

export async function registerStudentAction(
  _previous: RegistrationFormState,
  formData: FormData,
): Promise<RegistrationFormState> {
  if (await getCurrentUser())
    return { error: "Keluar dari akun sebelum mendaftar akun mahasiswa." };
  const result = await registerStudent(
    {
      fullName: formData.get("fullName"),
      identifier: formData.get("identifier"),
      email: formData.get("email"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
    },
    registrationClientIp(await headers()),
  );
  return result;
}
