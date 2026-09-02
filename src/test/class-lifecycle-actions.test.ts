/** @format */

// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthorizationError } from "@/lib/errors";

const requireRoleOrThrow = vi.fn();
const requireLecturerOfClass = vi.fn();
const rpc = vi.fn();
const auditInsert = vi.fn();
const classStatus = vi.fn();
const classUpdate = vi.fn();
const touched: string[] = [];

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/supabase/auth", () => ({
  requireRoleOrThrow: (role: string) => requireRoleOrThrow(role),
  requireLecturerOfClass: (classId: string) => requireLecturerOfClass(classId),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      touched.push(`admin:${table}`);
      return { insert: (row: unknown) => auditInsert(row) };
    },
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    rpc: (name: string, args: unknown) => {
      touched.push(`rpc:${name}`);
      return rpc(name, args);
    },
    from(table: string) {
      touched.push(table);
      const chain = {
        select: () => chain,
        eq: () => chain,
        is: () => chain,
        maybeSingle: async () => classStatus(),
        update: (row: unknown) => ({ eq: async () => classUpdate(row) }),
      };
      return chain;
    },
  }),
}));

const {
  createLecturerClassAction,
  publishLecturerClassAction,
  enrollStudentByLecturerAction,
  searchStudentsAction,
} = await import("@/actions/courses/classes");

const LECTURER = "11111111-1111-4111-8111-111111111111";
const INTRUDER = "99999999-9999-4999-8999-999999999999";
const COURSE = "44444444-4444-4444-8444-444444444444";
const PERIOD = "55555555-5555-4555-8555-555555555555";
const CLASS_ID = "66666666-6666-4666-8666-666666666666";
const STUDENT = "77777777-7777-4777-8777-777777777777";

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.append(key, value);
  return data;
}

const creation = { courseId: COURSE, academicPeriodId: PERIOD, code: "A" };

beforeEach(() => {
  vi.clearAllMocks();
  touched.length = 0;

  requireRoleOrThrow.mockResolvedValue({ id: LECTURER });
  requireLecturerOfClass.mockResolvedValue({ id: LECTURER });
  rpc.mockResolvedValue({ data: CLASS_ID, error: null });
  auditInsert.mockResolvedValue({ error: null });
  classStatus.mockResolvedValue({ data: { status: "draft" } });
  classUpdate.mockResolvedValue({ error: null });
});

describe("pembuatan kelas", () => {
  it("menuntut peran dosen sebelum memproses masukan", async () => {
    requireRoleOrThrow.mockRejectedValue(
      new AuthorizationError("Akses ditolak."),
    );

    const result = await createLecturerClassAction({}, form(creation));

    expect(result.error).toBeTruthy();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("menyerahkan penulisan kepada satu fungsi basis data", async () => {
    await createLecturerClassAction({}, form(creation));

    expect(rpc).toHaveBeenCalledWith("create_lecturer_class", {
      p_course_id: COURSE,
      p_academic_period_id: PERIOD,
      p_code: "A",
      p_capacity: null,
    });
  });

  it("tidak meneruskan lecturerId maupun status dari peramban", async () => {
    await createLecturerClassAction(
      {},
      form({ ...creation, lecturerId: INTRUDER, status: "published" }),
    );

    const [, args] = rpc.mock.calls[0]!;
    expect(JSON.stringify(args)).not.toContain(INTRUDER);
    expect(JSON.stringify(args)).not.toContain("published");
  });

  it("tidak lagi menulis lewat service role", async () => {
    await createLecturerClassAction({}, form(creation));

    expect(touched.some((item) => item.startsWith("admin:"))).toBe(false);
  });

  it("mengarahkan ke kelas yang baru dibuat", async () => {
    const result = await createLecturerClassAction({}, form(creation));

    expect(result.redirectTo).toBe(`/app/lecturer/classes/${CLASS_ID}`);
  });

  it("menyampaikan kelas kembar tanpa membocorkan constraint", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { code: "23505", message: "duplicate key value violates ..." },
    });

    const result = await createLecturerClassAction({}, form(creation));

    expect(result.error).toBe(
      "Kelas dengan mata kuliah dan identitas tersebut sudah tersedia.",
    );
    expect(result.error).not.toContain("uq_");
  });

  it("menyampaikan mata kuliah lintas organisasi sebagai tidak tersedia", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { code: "P0002", message: "course_not_found" },
    });

    const result = await createLecturerClassAction({}, form(creation));

    expect(result.error).toBe(
      "Mata kuliah tersebut tidak tersedia untuk Anda.",
    );
  });

  it("menyampaikan periode lintas organisasi sebagai tidak tersedia", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { code: "P0002", message: "period_not_found" },
    });

    const result = await createLecturerClassAction({}, form(creation));

    expect(result.error).toBe(
      "Periode akademik tersebut tidak tersedia untuk Anda.",
    );
  });
});

describe("penerbitan kelas", () => {
  const publish = { classId: CLASS_ID, status: "published" };

  it("menuntut dosen pengampu kelas tersebut", async () => {
    requireLecturerOfClass.mockRejectedValue(
      new AuthorizationError("Akses ditolak."),
    );

    const result = await publishLecturerClassAction({}, form(publish));

    expect(result.error).toBeTruthy();
    expect(classUpdate).not.toHaveBeenCalled();
  });

  it("menerbitkan kelas yang masih draf", async () => {
    const result = await publishLecturerClassAction({}, form(publish));

    expect(classUpdate).toHaveBeenCalledWith({ status: "published" });
    expect(result.ok).toBe(true);
  });

  it("mengembalikan kelas terbit menjadi draf", async () => {
    classStatus.mockResolvedValue({ data: { status: "published" } });

    await publishLecturerClassAction(
      {},
      form({ classId: CLASS_ID, status: "draft" }),
    );

    expect(classUpdate).toHaveBeenCalledWith({ status: "draft" });
  });

  it("menolak pengarsipan lewat jalur dosen", async () => {
    const result = await publishLecturerClassAction(
      {},
      form({ classId: CLASS_ID, status: "archived" }),
    );

    expect(result.fieldErrors?.["status"]).toBeTruthy();
    expect(classUpdate).not.toHaveBeenCalled();
  });

  it("menolak perpindahan status yang tidak berubah", async () => {
    classStatus.mockResolvedValue({ data: { status: "published" } });

    const result = await publishLecturerClassAction({}, form(publish));

    expect(result.error).toBe(
      "Perubahan status tersebut tidak diizinkan untuk kelas ini.",
    );
    expect(classUpdate).not.toHaveBeenCalled();
  });

  it("mencatat penerbitan ke audit_logs", async () => {
    await publishLecturerClassAction({}, form(publish));

    expect(auditInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "class_published",
        subject_table: "classes",
        subject_id: CLASS_ID,
        actor_id: LECTURER,
        before: { status: "draft" },
        after: { status: "published" },
      }),
    );
  });
});

describe("pendaftaran mahasiswa", () => {
  const enrollment = { classId: CLASS_ID, studentId: STUDENT };

  it("menuntut dosen pengampu kelas tersebut", async () => {
    requireLecturerOfClass.mockRejectedValue(
      new AuthorizationError("Akses ditolak."),
    );

    const result = await enrollStudentByLecturerAction({}, form(enrollment));

    expect(result.error).toBeTruthy();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("menyerahkan pemeriksaan peran kepada fungsi basis data", async () => {
    await enrollStudentByLecturerAction({}, form(enrollment));

    expect(rpc).toHaveBeenCalledWith("enroll_student_in_class", {
      p_class_id: CLASS_ID,
      p_student_id: STUDENT,
    });
  });

  it("menolak pendaftaran ganda dengan pesan manusiawi", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { code: "23505", message: "already_enrolled" },
    });

    const result = await enrollStudentByLecturerAction({}, form(enrollment));

    expect(result.error).toBe("Mahasiswa sudah terdaftar di kelas ini.");
  });

  it("menolak akun yang bukan mahasiswa organisasi ini", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { code: "P0002", message: "student_not_found" },
    });

    const result = await enrollStudentByLecturerAction({}, form(enrollment));

    expect(result.error).toBe(
      "Mahasiswa tersebut tidak ditemukan di organisasi Anda.",
    );
  });

  it("menolak masukan tanpa mahasiswa", async () => {
    const result = await enrollStudentByLecturerAction(
      {},
      form({ classId: CLASS_ID, studentId: "" }),
    );

    expect(result.fieldErrors?.["studentId"]).toBeTruthy();
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("pencarian mahasiswa", () => {
  it("menolak dosen yang bukan pengampu kelas", async () => {
    requireLecturerOfClass.mockRejectedValue(
      new AuthorizationError("Akses ditolak."),
    );

    const result = await searchStudentsAction(CLASS_ID, "budi");

    expect(result.ok).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("mencari lewat fungsi basis data, bukan tabel profil", async () => {
    rpc.mockResolvedValue({
      data: [{ id: STUDENT, full_name: "Budi", identifier: "1234" }],
      error: null,
    });

    const result = await searchStudentsAction(CLASS_ID, "budi");

    expect(rpc).toHaveBeenCalledWith("search_enrollable_students", {
      p_class_id: CLASS_ID,
      p_query: "budi",
      p_limit: 10,
    });
    expect(touched).not.toContain("profiles");
    expect(result).toEqual({
      ok: true,
      students: [{ id: STUDENT, fullName: "Budi", identifier: "1234" }],
    });
  });
});
