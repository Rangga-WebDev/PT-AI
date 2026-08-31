/** @format */

// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthorizationError } from "@/lib/errors";
import {
  formatMaterialSize,
  materialExtractionNote,
  materialFormatLabel,
  materialStatusTone,
} from "@/lib/materials/labels";
import type { MaterialView } from "@/lib/materials/types";

const requireLecturerOfClass = vi.fn();
const listClassMaterials = vi.fn();
const getClassDetail = vi.fn();

// Halaman ini menarik komponen klien yang mengimpor Server Action, sehingga
// penjaga `server-only` ikut termuat walau tak satu pun dijalankan di sini.
vi.mock("server-only", () => ({}));

vi.mock("@/actions/courses/materials", () => ({
  createLinkMaterialAction: vi.fn(),
  createNoteMaterialAction: vi.fn(),
  updateMaterialAction: vi.fn(),
  setMaterialPublicationAction: vi.fn(),
  deleteMaterialAction: vi.fn(),
  requestMaterialDownloadAction: vi.fn(),
}));

vi.mock("@/lib/supabase/auth", () => ({
  requireLecturerOfClass: (classId: string) => requireLecturerOfClass(classId),
}));

vi.mock("@/server/repositories/classes", () => ({
  getClassDetail: (classId: string) => getClassDetail(classId),
}));

vi.mock("@/server/repositories/materials", () => ({
  listClassMaterials: (classId: string) => listClassMaterials(classId),
}));

const CLASS_ID = "11111111-1111-4111-8111-111111111111";

const { default: MaterialsPage } =
  await import("@/app/(protected)/app/lecturer/classes/[classId]/materials/page");

function pageProps() {
  return {
    params: Promise.resolve({ classId: CLASS_ID }),
    searchParams: Promise.resolve({}),
  };
}

function base(overrides: Partial<MaterialView> = {}): MaterialView {
  return {
    id: "22222222-2222-4222-8222-222222222222",
    title: "RPS",
    description: null,
    resourceType: "file",
    materialKind: "rps",
    status: "draft",
    visibility: "student",
    sequence: 1,
    url: null,
    hasFile: true,
    mimeType: "application/pdf",
    sizeBytes: 1024,
    originalFilename: "rps.pdf",
    extractionStatus: "pending",
    extractedAt: null,
    createdAt: "2026-08-31T00:00:00.000Z",
    updatedAt: "2026-08-31T00:00:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  requireLecturerOfClass.mockResolvedValue({ id: "lecturer" });
  getClassDetail.mockResolvedValue({ code: "PKN-101", name: "A" });
  listClassMaterials.mockResolvedValue([]);
});

describe("penjaga halaman materi dosen", () => {
  it("menolak sebelum satu baris pun dibaca ketika pengguna bukan pengampu", async () => {
    requireLecturerOfClass.mockRejectedValue(new AuthorizationError());

    await expect(MaterialsPage(pageProps())).rejects.toBeInstanceOf(
      AuthorizationError,
    );

    expect(listClassMaterials).not.toHaveBeenCalled();
  });

  it("membaca bahan kelas ketika pengampu terverifikasi", async () => {
    await MaterialsPage(pageProps());

    expect(requireLecturerOfClass).toHaveBeenCalledWith(CLASS_ID);
    expect(listClassMaterials).toHaveBeenCalledWith(CLASS_ID);
  });
});

describe("label bahan ajar", () => {
  it("menyebut bentuk bahan, bukan nilai kolom", () => {
    expect(materialFormatLabel(base())).toBe("PDF");
    expect(materialFormatLabel(base({ resourceType: "link" }))).toBe("Tautan");
    expect(materialFormatLabel(base({ resourceType: "note" }))).toBe("Tulisan");
    expect(materialFormatLabel(base({ mimeType: "text/markdown" }))).toBe(
      "Teks",
    );
  });

  it("memetakan arsip ke nada terkunci, bukan terbit", () => {
    expect(materialStatusTone("published")).toBe("published");
    expect(materialStatusTone("archived")).toBe("locked");
    expect(materialStatusTone("draft")).toBe("draft");
  });

  it("hanya menyebut status pembacaan untuk bahan berkas", () => {
    expect(materialExtractionNote(base({ hasFile: false }))).toBeNull();
    expect(materialExtractionNote(base())).toMatchObject({
      label: "Menunggu pembacaan",
    });
    expect(
      materialExtractionNote(base({ extractionStatus: "succeeded" })),
    ).toMatchObject({ label: "Teks siap", tone: "published" });
    expect(
      materialExtractionNote(base({ extractionStatus: "failed" })),
    ).toMatchObject({ tone: "danger" });
  });

  it("menyatakan ukuran dalam satuan yang terbaca", () => {
    expect(formatMaterialSize(null)).toBeNull();
    expect(formatMaterialSize(512)).toBe("512 B");
    expect(formatMaterialSize(204_800)).toBe("200 KB");
    expect(formatMaterialSize(5_242_880)).toBe("5.0 MB");
  });
});
