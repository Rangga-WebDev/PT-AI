/** @format */

// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  role: vi.fn(),
  lecturer: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("@/lib/supabase/auth", () => ({
  requireRoleOrThrow: mocks.role,
  requireLecturerOfClass: mocks.lecturer,
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ rpc: mocks.rpc }),
}));
import { AuthorizationError } from "@/lib/errors";
import {
  decideEnrollmentAction,
  requestEnrollmentAction,
} from "@/actions/courses/enrollment-requests";

const classId = "10000000-0000-4000-8000-000000000001";
const requestId = "10000000-0000-4000-8000-000000000002";
const form = (values: Record<string, string>) => {
  const result = new FormData();
  for (const [name, value] of Object.entries(values)) result.set(name, value);
  return result;
};
beforeEach(() => {
  vi.resetAllMocks();
  mocks.role.mockResolvedValue({ id: "student" });
  mocks.lecturer.mockResolvedValue({ id: "lecturer" });
});

describe("pengajuan kelas", () => {
  it("memakai identitas sesi, bukan studentId dari peramban", async () => {
    mocks.rpc.mockResolvedValue({ error: null, data: { ok: true, requestId } });
    expect(
      (
        await requestEnrollmentAction(
          {},
          form({ joinCode: "abcdef123456", studentId: "other" }),
        )
      ).ok,
    ).toBe(true);
    expect(mocks.role).toHaveBeenCalledWith("student");
    expect(mocks.rpc).toHaveBeenCalledWith("request_enrollment", {
      p_join_code: "ABCDEF123456",
    });
  });
  it("kode cacat tidak memanggil database", async () => {
    expect(
      (await requestEnrollmentAction({}, form({ joinCode: "salah" })))
        .fieldErrors?.joinCode,
    ).toBeTruthy();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("hasil penolakan database bukan sukses palsu", async () => {
    mocks.rpc.mockResolvedValue({
      error: null,
      data: { ok: false, reason: "rate_limited" },
    });
    expect(
      (await requestEnrollmentAction({}, form({ joinCode: "ABCDEF123456" })))
        .error,
    ).toContain("Terlalu banyak");
  });
});

describe("keputusan dosen", () => {
  it("memeriksa dosen pengampu sebelum RPC", async () => {
    mocks.lecturer.mockRejectedValue(new AuthorizationError());
    expect(
      (
        await decideEnrollmentAction(
          {},
          form({ classId, requestId, decision: "approve" }),
        )
      ).error,
    ).toBeTruthy();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("penolakan tanpa alasan tidak dikirim", async () => {
    const result = await decideEnrollmentAction(
      {},
      form({ classId, requestId, decision: "reject", note: "x" }),
    );
    expect(result.fieldErrors?.note).toBeTruthy();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("keputusan hanya dikirim sekali ke transaksi database", async () => {
    mocks.rpc.mockResolvedValue({ error: null, data: requestId });
    expect(
      (
        await decideEnrollmentAction(
          {},
          form({ classId, requestId, decision: "approve" }),
        )
      ).ok,
    ).toBe(true);
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith(
      "decide_enrollment_request",
      { p_request_id: requestId, p_approve: true, p_note: null },
    );
  });
  it("kapasitas penuh mengembalikan galat yang jelas", async () => {
    mocks.rpc.mockResolvedValue({
      error: { message: "class_full", code: "23001" },
      data: null,
    });
    expect(
      (
        await decideEnrollmentAction(
          {},
          form({ classId, requestId, decision: "approve" }),
        )
      ).error,
    ).toContain("Kapasitas");
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
});
