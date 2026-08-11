/** @format */

import "server-only";

import crypto from "node:crypto";

import { AppError } from "@/lib/errors";
import { withAuditedAdmin } from "@/lib/supabase/admin";

export interface CreateAccountParams {
  actorId: string;
  organizationId: string;
  email: string;
  fullName: string;
  identifier: string;
  role: "student" | "lecturer" | "admin";
  studyProgramId?: string | undefined;
}

export interface CreateAccountResult {
  profileId: string;
  temporaryPassword: string;
}

// Kata sandi awal dibuat acak dan hanya dikembalikan sekali kepada
// administrator; tidak disimpan di mana pun dalam bentuk terbaca.
function generateTemporaryPassword(): string {
  return `Ptai-${crypto.randomBytes(9).toString("base64url")}`;
}

/**
 * Pembuatan akun memerlukan service role karena menulis ke auth.users,
 * sehingga seluruh langkahnya dibungkus audit (LOCK-TECH-021).
 */
export async function createAccount(
  params: CreateAccountParams,
): Promise<CreateAccountResult> {
  const temporaryPassword = generateTemporaryPassword();

  const profileId = await withAuditedAdmin(
    {
      actorId: params.actorId,
      action: "account.create",
      subjectTable: "profiles",
    },
    async (admin) => {
      const { data: created, error: createError } =
        await admin.auth.admin.createUser({
          email: params.email,
          password: temporaryPassword,
          email_confirm: true,
        });

      if (createError || !created.user) {
        throw new AppError(
          "CONFLICT",
          "Akun dengan surel tersebut tidak dapat dibuat. Periksa kembali surelnya.",
          createError?.message,
        );
      }

      const userId = created.user.id;

      const { error: profileError } = await admin.from("profiles").insert({
        id: userId,
        organization_id: params.organizationId,
        study_program_id: params.studyProgramId ?? null,
        full_name: params.fullName,
        identifier: params.identifier,
      });

      if (profileError) {
        // Membatalkan pembuatan auth user agar tidak meninggalkan akun yatim.
        await admin.auth.admin.deleteUser(userId);
        throw new AppError(
          "CONFLICT",
          "NIM/NIDN tersebut sudah dipakai pengguna lain.",
          profileError.message,
        );
      }

      const { data: role } = await admin
        .from("roles")
        .select("id")
        .eq("key", params.role)
        .maybeSingle();

      if (!role) {
        throw new AppError("UNEXPECTED", "Peran tidak ditemukan.");
      }

      const { error: assignmentError } = await admin
        .from("role_assignments")
        .insert({
          profile_id: userId,
          role_id: role.id,
          organization_id: params.organizationId,
          granted_by: params.actorId,
        });

      if (assignmentError) {
        throw new AppError(
          "UNEXPECTED",
          "Akun dibuat tetapi peran gagal diberikan. Hubungi pengembang.",
          assignmentError.message,
        );
      }

      return userId;
    },
  );

  return { profileId, temporaryPassword };
}

export async function grantRole(
  actorId: string,
  organizationId: string,
  profileId: string,
  role: "student" | "lecturer" | "admin",
): Promise<void> {
  await withAuditedAdmin(
    {
      actorId,
      action: "role.grant",
      subjectTable: "role_assignments",
      subjectId: profileId,
    },
    async (admin) => {
      const { data: roleRow } = await admin
        .from("roles")
        .select("id")
        .eq("key", role)
        .maybeSingle();

      if (!roleRow) throw new AppError("UNEXPECTED", "Peran tidak ditemukan.");

      const { data: existing } = await admin
        .from("role_assignments")
        .select("id")
        .eq("profile_id", profileId)
        .eq("role_id", roleRow.id)
        .is("revoked_at", null)
        .maybeSingle();

      if (existing) return;

      const { error } = await admin.from("role_assignments").insert({
        profile_id: profileId,
        role_id: roleRow.id,
        organization_id: organizationId,
        granted_by: actorId,
      });

      if (error) {
        throw new AppError(
          "UNEXPECTED",
          "Peran gagal diberikan.",
          error.message,
        );
      }
    },
  );
}

/** Pencabutan peran mengisi revoked_at, bukan menghapus baris (jejak tetap ada). */
export async function revokeRole(
  actorId: string,
  profileId: string,
  role: "student" | "lecturer" | "admin",
): Promise<void> {
  await withAuditedAdmin(
    {
      actorId,
      action: "role.revoke",
      subjectTable: "role_assignments",
      subjectId: profileId,
    },
    async (admin) => {
      const { data: roleRow } = await admin
        .from("roles")
        .select("id")
        .eq("key", role)
        .maybeSingle();

      if (!roleRow) throw new AppError("UNEXPECTED", "Peran tidak ditemukan.");

      const { error } = await admin
        .from("role_assignments")
        .update({ revoked_at: new Date().toISOString(), revoked_by: actorId })
        .eq("profile_id", profileId)
        .eq("role_id", roleRow.id)
        .is("revoked_at", null);

      if (error) {
        throw new AppError("UNEXPECTED", "Peran gagal dicabut.", error.message);
      }
    },
  );
}
