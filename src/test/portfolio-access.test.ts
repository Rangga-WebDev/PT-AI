/** @format */

// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthorizationError } from "@/lib/errors";

const requireClassAccess = vi.fn();
const requireLecturerOfClass = vi.fn();
const getClassDetail = vi.fn();
const getEnrolledStudent = vi.fn();
const getClassPortfolio = vi.fn();
const notFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});

vi.mock("server-only", () => ({}));

vi.mock("next/navigation", () => ({
  notFound: () => notFound(),
  usePathname: () => "/",
}));

vi.mock("@/lib/supabase/auth", () => ({
  requireClassAccess: (id: string) => requireClassAccess(id),
  requireLecturerOfClass: (id: string) => requireLecturerOfClass(id),
}));

vi.mock("@/server/repositories/classes", () => ({
  getClassDetail: (id: string) => getClassDetail(id),
  getEnrolledStudent: (classId: string, studentId: string) =>
    getEnrolledStudent(classId, studentId),
}));

vi.mock("@/server/repositories/portfolio", () => ({
  getClassPortfolio: (classId: string, studentId: string) =>
    getClassPortfolio(classId, studentId),
}));

const StudentPortfolioPage = (
  await import("@/app/(protected)/app/student/classes/[classId]/portfolio/page")
).default;

const StudentMeetingPage = (
  await import("@/app/(protected)/app/student/classes/[classId]/portfolio/[moduleId]/page")
).default;

const LecturerPortfolioPage = (
  await import("@/app/(protected)/app/lecturer/classes/[classId]/students/[studentId]/portfolio/page")
).default;

const CLASS_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_CLASS = "99999999-9999-4999-8999-999999999999";
const STUDENT_ID = "22222222-2222-4222-8222-222222222222";
const OTHER_STUDENT = "33333333-3333-4333-8333-333333333333";
const MODULE_ID = "44444444-4444-4444-8444-444444444444";

const MEETING = {
  meeting: { id: MODULE_ID, sequence: 4, title: "Demokrasi Digital" },
  activities: [],
  counts: {
    activities: 0,
    revisions: 0,
    reflections: 0,
    verifications: 0,
    aiAssistance: 0,
    lecturerFeedback: 0,
  },
  observedSeconds: null,
  hasEvidence: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  requireClassAccess.mockResolvedValue({ id: STUDENT_ID });
  requireLecturerOfClass.mockResolvedValue({ id: "lecturer" });
  getClassDetail.mockResolvedValue({
    id: CLASS_ID,
    code: "A",
    name: "PKN A",
    courseName: "Pendidikan Kewarganegaraan",
    academicPeriod: "2026/2027 Ganjil",
    status: "published",
    lecturerNames: [],
    studentCount: 1,
  });
  getEnrolledStudent.mockResolvedValue({
    profileId: STUDENT_ID,
    fullName: "Mahasiswa Uji",
    identifier: "DEV-MHS-001",
  });
  getClassPortfolio.mockResolvedValue([MEETING]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("portofolio mahasiswa", () => {
  it("menolak yang bukan peserta kelas sebelum data dibaca", async () => {
    requireClassAccess.mockRejectedValue(new AuthorizationError());

    await expect(
      StudentPortfolioPage({
        params: Promise.resolve({ classId: CLASS_ID }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toBeInstanceOf(AuthorizationError);

    expect(getClassPortfolio).not.toHaveBeenCalled();
  });

  // Tidak ada studentId di URL; identitas selalu datang dari sesi.
  it("hanya membaca portofolio milik pengguna yang masuk", async () => {
    await StudentPortfolioPage({
      params: Promise.resolve({ classId: CLASS_ID }),
      searchParams: Promise.resolve({}),
    });

    expect(getClassPortfolio).toHaveBeenCalledWith(CLASS_ID, STUDENT_ID);
  });

  it("mengambil identitas dari sesi, bukan dari nilai lain", async () => {
    requireClassAccess.mockResolvedValue({ id: OTHER_STUDENT });

    await StudentPortfolioPage({
      params: Promise.resolve({ classId: CLASS_ID }),
      searchParams: Promise.resolve({}),
    });

    expect(getClassPortfolio).toHaveBeenCalledWith(CLASS_ID, OTHER_STUDENT);
  });

  // Pertemuan dicari di dalam hasil yang sudah tersaring kelas.
  it("menolak pertemuan yang bukan milik kelas ini", async () => {
    await expect(
      StudentMeetingPage({
        params: Promise.resolve({
          classId: CLASS_ID,
          moduleId: "55555555-5555-4555-8555-555555555555",
        }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("menampilkan pertemuan milik kelas ini", async () => {
    await StudentMeetingPage({
      params: Promise.resolve({ classId: CLASS_ID, moduleId: MODULE_ID }),
      searchParams: Promise.resolve({}),
    });

    expect(getClassPortfolio).toHaveBeenCalledWith(CLASS_ID, STUDENT_ID);
  });
});

describe("portofolio dari sisi dosen", () => {
  function props(studentId = STUDENT_ID) {
    return {
      params: Promise.resolve({ classId: CLASS_ID, studentId }),
      searchParams: Promise.resolve({}),
    };
  }

  it("menolak dosen di luar kelas sebelum data dibaca", async () => {
    requireLecturerOfClass.mockRejectedValue(new AuthorizationError());

    await expect(LecturerPortfolioPage(props())).rejects.toBeInstanceOf(
      AuthorizationError,
    );

    expect(getEnrolledStudent).not.toHaveBeenCalled();
    expect(getClassPortfolio).not.toHaveBeenCalled();
  });

  // Id mahasiswa dari URL tidak pernah cukup; kepesertaannya diperiksa.
  it("menolak mahasiswa yang bukan peserta kelas ini", async () => {
    getEnrolledStudent.mockResolvedValue(null);

    await expect(LecturerPortfolioPage(props(OTHER_STUDENT))).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );

    expect(getClassPortfolio).not.toHaveBeenCalled();
  });

  it("memeriksa kepesertaan terhadap kelas yang sedang dibuka", async () => {
    await LecturerPortfolioPage(props());

    expect(getEnrolledStudent).toHaveBeenCalledWith(CLASS_ID, STUDENT_ID);
    expect(getEnrolledStudent).not.toHaveBeenCalledWith(
      OTHER_CLASS,
      STUDENT_ID,
    );
  });

  it("membaca portofolio mahasiswa yang terdaftar", async () => {
    await LecturerPortfolioPage(props());

    expect(getClassPortfolio).toHaveBeenCalledWith(CLASS_ID, STUDENT_ID);
  });
});
