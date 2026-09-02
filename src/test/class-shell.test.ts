/** @format */

// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthorizationError } from "@/lib/errors";
import {
  isActiveClassNav,
  lecturerClassNav,
  studentClassNav,
} from "@/lib/classes/navigation";

const requireClassAccess = vi.fn();
const requireLecturerOfClass = vi.fn();
const getClassDetail = vi.fn();
const listClassMaterials = vi.fn();
const listModulesWithUnits = vi.fn();
const listStudentUnits = vi.fn();
const listClassMembers = vi.fn();
const getReadableMaterial = vi.fn();
const notFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});

vi.mock("server-only", () => ({}));

vi.mock("next/navigation", () => ({
  notFound: () => notFound(),
  useRouter: () => ({ refresh: vi.fn() }),
  usePathname: () => "/",
}));

vi.mock("@/actions/courses/materials", () => ({
  requestMaterialDownloadAction: vi.fn(),
  createLinkMaterialAction: vi.fn(),
  createNoteMaterialAction: vi.fn(),
  updateMaterialAction: vi.fn(),
  setMaterialPublicationAction: vi.fn(),
  deleteMaterialAction: vi.fn(),
  extractMaterialAction: vi.fn(),
}));

vi.mock("@/lib/supabase/auth", () => ({
  requireClassAccess: (id: string) => requireClassAccess(id),
  requireLecturerOfClass: (id: string) => requireLecturerOfClass(id),
}));

vi.mock("@/server/repositories/classes", () => ({
  getClassDetail: (id: string) => getClassDetail(id),
  listClassMembers: (id: string) => listClassMembers(id),
}));

vi.mock("@/server/repositories/content", () => ({
  listModulesWithUnits: (id: string) => listModulesWithUnits(id),
  listStudentUnits: (id: string) => listStudentUnits(id),
}));

vi.mock("@/server/repositories/materials", () => ({
  listClassMaterials: (id: string) => listClassMaterials(id),
  getReadableMaterial: (id: string) => getReadableMaterial(id),
}));

const StudentMaterialsPage = (
  await import("@/app/(protected)/app/student/classes/[classId]/materials/page")
).default;

const StudentMeetingsPage = (
  await import("@/app/(protected)/app/student/classes/[classId]/meetings/page")
).default;

const StudentReadingPage = (
  await import("@/app/(protected)/app/student/classes/[classId]/materials/[materialId]/page")
).default;

const LecturerMeetingsPage = (
  await import("@/app/(protected)/app/lecturer/classes/[classId]/meetings/page")
).default;

const CLASS_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_CLASS = "99999999-9999-4999-8999-999999999999";
const MATERIAL_ID = "22222222-2222-4222-8222-222222222222";

function props() {
  return {
    params: Promise.resolve({ classId: CLASS_ID }),
    searchParams: Promise.resolve({}),
  };
}

function readingProps(materialId: string) {
  return {
    params: Promise.resolve({ classId: CLASS_ID, materialId }),
    searchParams: Promise.resolve({}),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  requireClassAccess.mockResolvedValue({ id: "student" });
  requireLecturerOfClass.mockResolvedValue({ id: "lecturer" });
  getClassDetail.mockResolvedValue({
    id: CLASS_ID,
    code: "A",
    name: "PKN A",
    courseName: "Pendidikan Kewarganegaraan",
    academicPeriod: "2026/2027 Ganjil",
    status: "published",
    lecturerNames: ["Dosen Uji"],
    studentCount: 1,
  });
  listClassMaterials.mockResolvedValue([]);
  listModulesWithUnits.mockResolvedValue([]);
  listStudentUnits.mockResolvedValue([]);
  listClassMembers.mockResolvedValue({ lecturers: [], students: [] });
  getReadableMaterial.mockResolvedValue({
    id: MATERIAL_ID,
    classId: CLASS_ID,
    title: "Catatan",
    description: null,
    resourceType: "note",
    text: "Isi materi.",
    createdAt: "2026-09-01T00:00:00.000Z",
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("navigasi kelas", () => {
  it("menawarkan tujuan yang sama urutannya untuk kedua peran", () => {
    const lecturer = lecturerClassNav(CLASS_ID).map((item) => item.label);
    const student = studentClassNav(CLASS_ID).map((item) => item.label);

    expect(lecturer.slice(0, 4)).toEqual([
      "Ringkasan",
      "Materi",
      "Pertemuan",
      "PT-AI",
    ]);
    expect(student.slice(0, 4)).toEqual([
      "Ringkasan",
      "Materi",
      "Pertemuan",
      "PT-AI",
    ]);
  });

  it("membedakan tujuan menurut peran", () => {
    const lecturer = lecturerClassNav(CLASS_ID).map((item) => item.label);
    const student = studentClassNav(CLASS_ID).map((item) => item.label);

    expect(lecturer).toContain("Mahasiswa");
    expect(lecturer).not.toContain("Portofolio");
    expect(student).toContain("Portofolio");
    expect(student).not.toContain("Mahasiswa");
  });

  it("seluruh tautan mahasiswa menunjuk ke rute yang ada", () => {
    for (const item of studentClassNav(CLASS_ID)) {
      expect(item.available).toBe(true);
      expect(item.href.startsWith("/app/")).toBe(true);
    }
  });

  it("seluruh tautan dosen menunjuk ke rute yang ada", () => {
    for (const item of lecturerClassNav(CLASS_ID)) {
      expect(item.available).toBe(true);
      expect(item.href.startsWith("/app/")).toBe(true);
    }
  });

  it("menyorot induk ketika berada di halaman turunannya", () => {
    const overview = `/app/student/classes/${CLASS_ID}`;
    const materials = {
      label: "Materi",
      href: `${overview}/materials`,
      available: true,
    };

    expect(
      isActiveClassNav(materials, `${overview}/materials/abc`, overview),
    ).toBe(true);
  });

  // Ringkasan adalah awalan seluruh tautan lain, jadi harus cocok persis.
  it("tidak menyorot ringkasan pada setiap halaman", () => {
    const overview = `/app/student/classes/${CLASS_ID}`;
    const item = { label: "Ringkasan", href: overview, available: true };

    expect(isActiveClassNav(item, `${overview}/materials`, overview)).toBe(
      false,
    );
    expect(isActiveClassNav(item, overview, overview)).toBe(true);
  });
});

describe("penjaga rute mahasiswa", () => {
  it("menolak yang bukan peserta kelas sebelum data dibaca", async () => {
    requireClassAccess.mockRejectedValue(new AuthorizationError());

    await expect(StudentMaterialsPage(props())).rejects.toBeInstanceOf(
      AuthorizationError,
    );
    expect(listClassMaterials).not.toHaveBeenCalled();
  });

  it("membaca bahan kelas ketika peserta terverifikasi", async () => {
    await StudentMaterialsPage(props());

    expect(requireClassAccess).toHaveBeenCalledWith(CLASS_ID);
    expect(listClassMaterials).toHaveBeenCalledWith(CLASS_ID);
  });

  // Penyaring status dan visibilitas tetap milik RLS.
  it("tidak menyalin penyaring otorisasi ke lapisan halaman", async () => {
    await StudentMaterialsPage(props());

    expect(listClassMaterials).toHaveBeenCalledTimes(1);
    expect(listClassMaterials).toHaveBeenCalledWith(CLASS_ID);
  });

  it("menolak akses pertemuan bagi yang bukan peserta", async () => {
    requireClassAccess.mockRejectedValue(new AuthorizationError());

    await expect(StudentMeetingsPage(props())).rejects.toBeInstanceOf(
      AuthorizationError,
    );
    expect(listModulesWithUnits).not.toHaveBeenCalled();
  });
});

describe("halaman baca materi tulisan", () => {
  it("menolak bahan milik kelas lain", async () => {
    getReadableMaterial.mockResolvedValue({
      id: MATERIAL_ID,
      classId: OTHER_CLASS,
      title: "Catatan kelas lain",
      description: null,
      resourceType: "note",
      text: "Rahasia.",
      createdAt: "2026-09-01T00:00:00.000Z",
    });

    await expect(StudentReadingPage(readingProps(MATERIAL_ID))).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
  });

  it("menolak sebelum bahan dibaca bila bukan peserta", async () => {
    requireClassAccess.mockRejectedValue(new AuthorizationError());

    await expect(
      StudentReadingPage(readingProps(MATERIAL_ID)),
    ).rejects.toBeInstanceOf(AuthorizationError);
    expect(getReadableMaterial).not.toHaveBeenCalled();
  });

  it("menampilkan bahan milik kelas yang sedang dibuka", async () => {
    await StudentReadingPage(readingProps(MATERIAL_ID));

    expect(getReadableMaterial).toHaveBeenCalledWith(MATERIAL_ID);
  });
});

describe("penjaga rute dosen", () => {
  it("menolak dosen di luar kelas", async () => {
    requireLecturerOfClass.mockRejectedValue(new AuthorizationError());

    await expect(LecturerMeetingsPage(props())).rejects.toBeInstanceOf(
      AuthorizationError,
    );
    expect(listModulesWithUnits).not.toHaveBeenCalled();
  });

  it("membaca pertemuan yang sudah diterapkan", async () => {
    listModulesWithUnits.mockResolvedValue([
      {
        id: "m1",
        title: "Kedudukan warga negara",
        description: "Hak dan kewajiban",
        sequence: 1,
        status: "draft",
        units: [],
      },
    ]);

    await LecturerMeetingsPage(props());

    expect(requireLecturerOfClass).toHaveBeenCalledWith(CLASS_ID);
    expect(listModulesWithUnits).toHaveBeenCalledWith(CLASS_ID);
  });
});
