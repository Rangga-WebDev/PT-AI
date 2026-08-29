/** @format */

import type { Metadata } from "next";

import { AuthScreen } from "@/features/auth/components/auth-screen";

export const metadata: Metadata = {
  title: "Masuk",
};

const ERROR_MESSAGES: Record<string, string> = {
  "tautan-tidak-valid": "Tautan tidak valid. Silakan minta tautan baru.",
  "tautan-kedaluwarsa": "Tautan sudah kedaluwarsa. Silakan minta tautan baru.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const redirectTo =
    typeof params.redirectTo === "string" ? params.redirectTo : undefined;
  const errorKey = typeof params.error === "string" ? params.error : undefined;
  const errorMessage = errorKey ? ERROR_MESSAGES[errorKey] : undefined;

  return <AuthScreen redirectTo={redirectTo} errorMessage={errorMessage} />;
}
