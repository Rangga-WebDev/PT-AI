/** @format */

import "server-only";

import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { registerStudentSchema } from "@/lib/validation/auth";

export const REGISTRATION_UNAVAILABLE =
  "Pendaftaran belum tersedia. Hubungi administrator institusi.";
export const REGISTRATION_FAILED =
  "Akun tidak dapat dibuat. Bila sudah pernah mendaftar, masuk atau hubungi administrator untuk memeriksa NIM.";

type RegistrationResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export function registrationClientIp(
  headers: Pick<Headers, "get">,
): string | null {
  if (process.env.VERCEL === "1") {
    const value = headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
    return value && isIP(value) ? value : null;
  }
  return process.env.NODE_ENV !== "production" ? "127.0.0.1" : null;
}

export function registrationConfigured(): boolean {
  return z.uuid().safeParse(process.env.STUDENT_REGISTRATION_ORGANIZATION_ID)
    .success;
}

async function publicSignupDisabled(): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return false;
  const response = await fetch(`${url.replace(/\/$/, "")}/auth/v1/settings`, {
    headers: { apikey: key },
    cache: "no-store",
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) return false;
  const settings: unknown = await response.json();
  return z.object({ disable_signup: z.literal(true) }).safeParse(settings)
    .success;
}

export async function registerStudent(
  input: unknown,
  clientIp: string | null,
): Promise<RegistrationResult> {
  const parsed = registerStudentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Periksa kembali data pendaftaran.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const organizationId = process.env.STUDENT_REGISTRATION_ORGANIZATION_ID;
  const hashKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (
    !registrationConfigured() ||
    !organizationId ||
    !hashKey ||
    !clientIp ||
    !isIP(clientIp)
  ) {
    return { ok: false, error: REGISTRATION_UNAVAILABLE };
  }

  try {
    const admin = createAdminClient();
    const hash = (value: string) =>
      createHmac("sha256", hashKey).update(value).digest("hex");
    const limit = await admin.rpc("consume_registration_limit", {
      p_ip_hash: hash(`registration:ip:${clientIp}`),
      p_email_hash: hash(`registration:email:${parsed.data.email}`),
    });
    if (limit.error || limit.data !== true) {
      return {
        ok: false,
        error: limit.error
          ? REGISTRATION_UNAVAILABLE
          : "Terlalu banyak percobaan pendaftaran. Coba lagi setelah satu jam.",
      };
    }

    if (!(await publicSignupDisabled()))
      return { ok: false, error: REGISTRATION_UNAVAILABLE };

    const organization = await admin
      .from("organizations")
      .select("id")
      .eq("id", organizationId)
      .eq("is_active", true)
      .maybeSingle();
    if (organization.error || !organization.data)
      return { ok: false, error: REGISTRATION_UNAVAILABLE };

    const existing = await admin
      .from("profiles")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("identifier", parsed.data.identifier)
      .maybeSingle();
    if (existing.error || existing.data)
      return { ok: false, error: REGISTRATION_FAILED };

    const { data, error } = await admin.auth.admin.createUser({
      email: parsed.data.email,
      password: parsed.data.password,
      email_confirm: true,
      user_metadata: { full_name: parsed.data.fullName },
    });
    if (error || !data.user) return { ok: false, error: REGISTRATION_FAILED };

    const userId = data.user.id;
    try {
      const profile = await admin.rpc("register_student_profile", {
        p_user_id: userId,
        p_organization_id: organizationId,
        p_full_name: parsed.data.fullName,
        p_identifier: parsed.data.identifier,
      });
      if (profile.error || profile.data !== userId)
        throw new Error("profile_failed");
    } catch {
      const cleanup = await admin.auth.admin.deleteUser(userId);
      if (cleanup.error) console.error("[registration] cleanup_failed");
      return { ok: false, error: REGISTRATION_FAILED };
    }
    return { ok: true };
  } catch {
    console.error("[registration] unavailable");
    return { ok: false, error: REGISTRATION_UNAVAILABLE };
  }
}
