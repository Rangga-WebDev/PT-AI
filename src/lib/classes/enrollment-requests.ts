/** @format */

import { z } from "zod";
import type { Database } from "@/lib/supabase/types";

export const joinClassSchema = z.object({
  joinCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      /^[A-F0-9]{12}$/,
      "Kode gabung harus terdiri dari 12 karakter yang diberikan dosen.",
    ),
});

export const decideEnrollmentSchema = z
  .object({
    classId: z.uuid("Kelas tidak valid."),
    requestId: z.uuid("Pengajuan tidak valid."),
    decision: z.enum(["approve", "reject"], {
      error: "Keputusan tidak valid.",
    }),
    note: z.string().trim().max(500, "Catatan maksimal 500 karakter."),
  })
  .refine((value) => value.decision !== "reject" || value.note.length >= 5, {
    path: ["note"],
    message: "Alasan penolakan minimal 5 karakter.",
  });

export const ENROLLMENT_REQUEST_MESSAGE: Record<string, string> = {
  invalid_join_code: "Kode gabung tidak ditemukan atau kelas belum dibuka.",
  already_requested:
    "Pengajuan ke kelas ini sudah tercatat. Periksa statusnya di bawah.",
  already_enrolled: "Mahasiswa sudah terdaftar di kelas ini.",
  rate_limited:
    "Terlalu banyak percobaan kode kelas. Coba lagi setelah satu jam.",
  forbidden: "Anda tidak berwenang memproses pengajuan ini.",
  class_full:
    "Kapasitas kelas sudah penuh. Periksa kapasitas sebelum menyetujui.",
  class_unavailable: "Kelas belum diterbitkan atau sudah diarsipkan.",
  already_decided:
    "Pengajuan sudah diputuskan. Muat ulang halaman untuk melihat status terbaru.",
  student_not_found:
    "Akun mahasiswa tidak aktif atau tidak berada di institusi kelas ini.",
  invalid_decision: "Periksa keputusan dan alasan penolakan.",
};

export const REQUEST_STATUS_LABEL: Record<string, string> = {
  pending: "Menunggu persetujuan dosen",
  approved: "Disetujui",
  rejected: "Ditolak",
};

export type StudentEnrollmentRequest =
  Database["public"]["Functions"]["list_my_enrollment_requests"]["Returns"][number];
export type ClassEnrollmentRequest =
  Database["public"]["Functions"]["list_class_enrollment_requests"]["Returns"][number];
