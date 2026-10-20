/** @format */

import "server-only";

import crypto from "node:crypto";

import { AppError, NotFoundError } from "@/lib/errors";
import { createAdminClient, withAuditedAdmin } from "@/lib/supabase/admin";

// Tanpa karakter yang mudah tertukar saat didiktekan (0/O, 1/I/L).
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const DIGITS = "23456789";

export function generateTemporaryPassword(): string {
  const chars = Array.from(
    { length: 12 },
    () => ALPHABET[crypto.randomInt(ALPHABET.length)]!,
  );
  if (!chars.some((char) => DIGITS.includes(char))) {
    chars[crypto.randomInt(chars.length)] =
      DIGITS[crypto.randomInt(DIGITS.length)]!;
  }
  return `Ptai-${chars.slice(0, 4).join("")}-${chars.slice(4, 8).join("")}-${chars.slice(8).join("")}`;
}

type AdminClient = ReturnType<typeof createAdminClient>;

async function activeRoles(admin: AdminClient, profileId: string) {
  const { data } = await admin
    .from("role_assignments")
    .select("roles!inner(key)")
    .eq("profile_id", profileId)
    .is("revoked_at", null);
  return (data ?? []).map((row) => row.roles.key);
}

/**
 * Kata sandi sementara langsung ditandai wajib diganti, sehingga pemberinya
 * tidak memegang akses tetap ke akun tersebut.
 */
async function applyTemporaryPassword(
  actorId: string,
  action: string,
  targetId: string,
): Promise<string> {
  const temporaryPassword = generateTemporaryPassword();

  await withAuditedAdmin(
    { actorId, action, subjectTable: "profiles", subjectId: targetId },
    async (admin) => {
      const { error } = await admin.auth.admin.updateUserById(targetId, {
        password: temporaryPassword,
        app_metadata: { must_change_password: true },
      });
      if (error) {
        throw new AppError(
          "UNEXPECTED",
          "Kata sandi gagal diatur ulang. Coba lagi.",
          error.message,
        );
      }
    },
  );

  return temporaryPassword;
}

export async function resetPasswordAsAdmin(params: {
  actorId: string;
  organizationId: string;
  targetId: string;
}): Promise<string> {
  if (params.actorId === params.targetId) {
    throw new AppError(
      "VALIDATION",
      "Ganti kata sandi Anda sendiri lewat menu Kata sandi.",
    );
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("organization_id")
    .eq("id", params.targetId)
    .maybeSingle();

  if (!profile || profile.organization_id !== params.organizationId) {
    throw new NotFoundError("Pengguna tidak ditemukan.");
  }

  const roles = await activeRoles(admin, params.targetId);
  if (roles.includes("admin")) {
    throw new AppError(
      "AUTHORIZATION",
      "Kata sandi administrator tidak dapat diatur ulang dari halaman ini.",
    );
  }
  if (!roles.includes("student") && !roles.includes("lecturer")) {
    throw new AppError(
      "VALIDATION",
      "Pengguna ini belum memiliki peran mahasiswa atau dosen.",
    );
  }

  return applyTemporaryPassword(
    params.actorId,
    "account.password_reset.admin",
    params.targetId,
  );
}

/** Pemanggil wajib sudah memastikan dirinya dosen pengampu kelas tersebut. */
export async function resetStudentPasswordAsLecturer(params: {
  actorId: string;
  classId: string;
  studentId: string;
}): Promise<string> {
  const admin = createAdminClient();

  const { data: enrollment } = await admin
    .from("enrollments")
    .select("id")
    .eq("class_id", params.classId)
    .eq("student_id", params.studentId)
    .eq("status", "active")
    .maybeSingle();

  if (!enrollment) {
    throw new NotFoundError("Mahasiswa tidak terdaftar aktif di kelas ini.");
  }

  const roles = await activeRoles(admin, params.studentId);
  if (roles.some((role) => role !== "student")) {
    throw new AppError(
      "AUTHORIZATION",
      "Kata sandi akun ini hanya dapat diatur ulang administrator.",
    );
  }

  return applyTemporaryPassword(
    params.actorId,
    "account.password_reset.lecturer",
    params.studentId,
  );
}

export async function clearPasswordChangeRequirement(
  userId: string,
): Promise<void> {
  const { error } = await createAdminClient().auth.admin.updateUserById(
    userId,
    { app_metadata: { must_change_password: false } },
  );
  if (error) {
    console.error("[auth] penanda ganti kata sandi gagal dihapus", {
      status: error.status ?? null,
    });
  }
}
