/** @format */

import { z } from "zod";

const requiredText = (label: string, max = 200) =>
  z
    .string()
    .trim()
    .min(1, `${label} wajib diisi.`)
    .max(max, `${label} maksimal ${max} karakter.`);

const code = z
  .string()
  .trim()
  .min(1, "Kode wajib diisi.")
  .max(32, "Kode maksimal 32 karakter.")
  .regex(
    /^[A-Za-z0-9._-]+$/,
    "Kode hanya boleh berisi huruf, angka, titik, garis bawah, dan tanda hubung.",
  );

const uuid = (label: string) => z.string().uuid(`${label} tidak valid.`);

export const organizationSchema = z.object({
  name: requiredText("Nama organisasi"),
  code: code,
  kind: requiredText("Jenis organisasi", 50).default("university"),
  timezone: requiredText("Zona waktu", 64).default("Asia/Jakarta"),
});

export const facultySchema = z.object({
  organizationId: uuid("Organisasi"),
  name: requiredText("Nama fakultas"),
  code,
});

export const studyProgramSchema = z.object({
  facultyId: uuid("Fakultas"),
  name: requiredText("Nama program studi"),
  code,
  degreeLevel: z.enum(["d3", "s1", "s2", "s3"], {
    message: "Jenjang tidak valid.",
  }),
});

export const academicPeriodSchema = z
  .object({
    name: requiredText("Nama periode"),
    code,
    startDate: z.string().min(1, "Tanggal mulai wajib diisi."),
    endDate: z.string().min(1, "Tanggal selesai wajib diisi."),
    isActive: z.boolean().default(false),
  })
  .refine((value) => new Date(value.endDate) > new Date(value.startDate), {
    path: ["endDate"],
    message: "Tanggal selesai harus setelah tanggal mulai.",
  });

export const courseSchema = z.object({
  studyProgramId: uuid("Program studi"),
  code,
  name: requiredText("Nama mata kuliah"),
  description: z.string().trim().max(2000).optional(),
  credits: z.coerce
    .number()
    .int("SKS harus bilangan bulat.")
    .min(1, "SKS minimal 1.")
    .max(8, "SKS maksimal 8."),
});

export const classSchema = z.object({
  courseId: uuid("Mata kuliah"),
  academicPeriodId: uuid("Periode akademik"),
  code,
  name: requiredText("Nama kelas"),
  capacity: z.coerce
    .number()
    .int("Kapasitas harus bilangan bulat.")
    .min(1, "Kapasitas minimal 1.")
    .max(500, "Kapasitas maksimal 500.")
    .optional(),
});

export const classStatusSchema = z.object({
  classId: uuid("Kelas"),
  status: z.enum(["draft", "published", "archived"], {
    message: "Status tidak valid.",
  }),
});

export const lecturerAssignmentSchema = z.object({
  classId: uuid("Kelas"),
  lecturerId: uuid("Dosen"),
  roleInClass: z.enum(["coordinator", "member"]).default("member"),
});

export const enrollmentSchema = z.object({
  classId: uuid("Kelas"),
  studentId: uuid("Mahasiswa"),
});

export const accountSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Surel wajib diisi.")
    .email("Format surel tidak valid."),
  fullName: requiredText("Nama lengkap"),
  identifier: requiredText("NIM/NIDN", 32),
  role: z.enum(["student", "lecturer", "admin"], {
    message: "Peran tidak valid.",
  }),
  studyProgramId: z.string().uuid().optional().or(z.literal("")),
});

export const roleAssignmentSchema = z.object({
  profileId: uuid("Pengguna"),
  role: z.enum(["student", "lecturer", "admin"], {
    message: "Peran tidak valid.",
  }),
});

export type OrganizationInput = z.infer<typeof organizationSchema>;
export type FacultyInput = z.infer<typeof facultySchema>;
export type StudyProgramInput = z.infer<typeof studyProgramSchema>;
export type AcademicPeriodInput = z.infer<typeof academicPeriodSchema>;
export type CourseInput = z.infer<typeof courseSchema>;
export type ClassInput = z.infer<typeof classSchema>;
export type AccountInput = z.infer<typeof accountSchema>;
