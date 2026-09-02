/** @format */

// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthorizationError } from "@/lib/errors";

const requireLecturerOfClass = vi.fn();
const maybeSingle = vi.fn();
const readMaterialObject = vi.fn();
const recordExtractionOutcome = vi.fn();

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/auth", () => ({
  requireLecturerOfClass: (classId: string) => requireLecturerOfClass(classId),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ is: () => ({ maybeSingle: () => maybeSingle() }) }),
      }),
    }),
  }),
}));

vi.mock("@/server/services/material-storage", () => ({
  readMaterialObject: (path: string) => readMaterialObject(path),
  recordExtractionOutcome: (id: string, outcome: unknown) =>
    recordExtractionOutcome(id, outcome),
}));

const { extractMaterial } =
  await import("@/server/services/material-extraction");

const CLASS_ID = "11111111-1111-4111-8111-111111111111";
const RESOURCE_ID = "22222222-2222-4222-8222-222222222222";

const MARKDOWN = new TextEncoder().encode(
  "# RPS\n\nPertemuan 1 membahas kedudukan warga negara dalam konstitusi.",
);

function row(overrides: Record<string, unknown> = {}) {
  return {
    data: {
      id: RESOURCE_ID,
      class_id: CLASS_ID,
      storage_path: `${CLASS_ID}/${RESOURCE_ID}`,
      mime_type: "text/markdown",
      extracted_text: null,
      ...overrides,
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  requireLecturerOfClass.mockResolvedValue({ id: "lecturer" });
  maybeSingle.mockResolvedValue(row());
  readMaterialObject.mockResolvedValue(MARKDOWN);
  recordExtractionOutcome.mockResolvedValue(undefined);
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("otorisasi ekstraksi", () => {
  // Mahasiswa gagal di gerbang yang sama: perannya bukan dosen pengampu.
  it("menolak pengguna yang bukan pengampu kelas dokumen", async () => {
    requireLecturerOfClass.mockRejectedValue(new AuthorizationError());

    const result = await extractMaterial(RESOURCE_ID);

    expect(result).toEqual({ ok: false, reason: "forbidden" });
    expect(readMaterialObject).not.toHaveBeenCalled();
    expect(recordExtractionOutcome).not.toHaveBeenCalled();
  });

  it("menolak dokumen yang tidak terlihat lewat sesi pengguna", async () => {
    maybeSingle.mockResolvedValue({ data: null });

    const result = await extractMaterial(RESOURCE_ID);

    expect(result).toEqual({ ok: false, reason: "resource_not_found" });
    expect(requireLecturerOfClass).not.toHaveBeenCalled();
  });

  it("menerima dosen pengampu kelas", async () => {
    const result = await extractMaterial(RESOURCE_ID);

    expect(result.ok).toBe(true);
    expect(requireLecturerOfClass).toHaveBeenCalledWith(CLASS_ID);
  });

  // Kunci objek tidak pernah datang dari permintaan.
  it("mengambil kunci objek dari basis data, bukan dari pemanggil", async () => {
    await extractMaterial(RESOURCE_ID);

    expect(readMaterialObject).toHaveBeenCalledWith(
      `${CLASS_ID}/${RESOURCE_ID}`,
    );
  });

  it("menolak bahan yang tidak punya berkas", async () => {
    maybeSingle.mockResolvedValue(row({ storage_path: null }));

    const result = await extractMaterial(RESOURCE_ID);

    expect(result).toEqual({ ok: false, reason: "no_file" });
  });
});

describe("pencatatan hasil", () => {
  it("menulis teks dan menandai berhasil", async () => {
    const result = await extractMaterial(RESOURCE_ID);

    expect(result.ok).toBe(true);
    expect(recordExtractionOutcome).toHaveBeenCalledWith(RESOURCE_ID, {
      status: "succeeded",
      text: expect.stringContaining("kedudukan warga negara"),
    });
  });

  it("menandai gagal ketika isinya tidak dapat dibaca", async () => {
    readMaterialObject.mockResolvedValue(new Uint8Array([0xff, 0xfe, 0xfd]));

    const result = await extractMaterial(RESOURCE_ID);

    expect(result.ok).toBe(false);
    expect(recordExtractionOutcome).toHaveBeenCalledWith(RESOURCE_ID, {
      status: "failed",
    });
  });

  it("menandai tak didukung untuk tipe di luar jangkauan", async () => {
    maybeSingle.mockResolvedValue(
      row({
        mime_type:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
    );
    readMaterialObject.mockResolvedValue(new Uint8Array([0x50, 0x4b, 3, 4]));

    await extractMaterial(RESOURCE_ID);

    expect(recordExtractionOutcome).toHaveBeenCalledWith(RESOURCE_ID, {
      status: "unsupported",
    });
  });

  // Gagal mengambil objek bukan gagal membaca dokumen; statusnya tidak diubah.
  it("tidak mengubah status ketika penyimpanan tak terjangkau", async () => {
    readMaterialObject.mockRejectedValue(new Error("storage down"));

    const result = await extractMaterial(RESOURCE_ID);

    expect(result).toEqual({ ok: false, reason: "storage_error" });
    expect(recordExtractionOutcome).not.toHaveBeenCalled();
  });

  it("tidak membocorkan pesan penyimpanan ke pemanggil", async () => {
    readMaterialObject.mockRejectedValue(
      new Error("service_role key invalid at bucket materials"),
    );

    const result = await extractMaterial(RESOURCE_ID);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("storage_error");
  });
});

describe("pengulangan", () => {
  it("menghasilkan tulisan yang sama pada pemanggilan berulang", async () => {
    await extractMaterial(RESOURCE_ID);
    await extractMaterial(RESOURCE_ID);

    expect(recordExtractionOutcome).toHaveBeenCalledTimes(2);
    expect(recordExtractionOutcome.mock.calls[0]).toEqual(
      recordExtractionOutcome.mock.calls[1],
    );
  });

  // Ekstraksi memperbarui baris yang sama; tidak ada baris atau objek baru.
  it("tidak pernah menulis objek maupun membuat baris", async () => {
    await extractMaterial(RESOURCE_ID);

    const outcome = recordExtractionOutcome.mock.calls[0]![1] as {
      status: string;
    };
    expect(outcome.status).toBe("succeeded");
    expect(readMaterialObject).toHaveBeenCalledTimes(1);
  });

  it("menolak jalan kedua yang tumpang tindih atas bahan yang sama", async () => {
    let release: (value: Uint8Array) => void = () => {};
    readMaterialObject.mockReturnValueOnce(
      new Promise<Uint8Array>((resolve) => {
        release = resolve;
      }),
    );

    const first = extractMaterial(RESOURCE_ID);
    const second = await extractMaterial(RESOURCE_ID);

    expect(second).toEqual({ ok: false, reason: "storage_error" });

    release(MARKDOWN);
    await expect(first).resolves.toMatchObject({ ok: true });
    expect(recordExtractionOutcome).toHaveBeenCalledTimes(1);
  });
});
