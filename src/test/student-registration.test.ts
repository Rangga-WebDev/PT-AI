/** @format */

// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  createUser: vi.fn(),
  deleteUser: vi.fn(),
  from: vi.fn(),
  fetch: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    rpc: mocks.rpc,
    from: mocks.from,
    auth: {
      admin: { createUser: mocks.createUser, deleteUser: mocks.deleteUser },
    },
  }),
}));

import {
  registerStudent,
  registrationClientIp,
  REGISTRATION_UNAVAILABLE,
} from "@/server/services/student-registration";

const organizationId = "10000000-0000-4000-8000-000000000001";
const studentId = "10000000-0000-4000-8000-000000000002";
const input = {
  fullName: "Mahasiswa",
  identifier: "001234567890",
  email: "mhs@student.unismuh.ac.id",
  password: "password-panjang-2026",
  confirmPassword: "password-panjang-2026",
};

function query(result: unknown) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    maybeSingle: async () => result,
  };
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("STUDENT_REGISTRATION_ORGANIZATION_ID", organizationId);
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-key-not-a-real-secret");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test-project.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-public-key");
  vi.stubGlobal("fetch", mocks.fetch);
  mocks.fetch.mockResolvedValue({
    ok: true,
    json: async () => ({ disable_signup: true }),
  });
  mocks.from.mockImplementation((table: string) =>
    query({
      data: table === "organizations" ? { id: organizationId } : null,
      error: null,
    }),
  );
  mocks.rpc.mockImplementation(async (name: string) => ({
    data: name === "consume_registration_limit" ? true : studentId,
    error: null,
  }));
  mocks.createUser.mockResolvedValue({
    data: { user: { id: studentId } },
    error: null,
  });
  mocks.deleteUser.mockResolvedValue({ error: null });
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("pendaftaran mahasiswa melalui server", () => {
  it("membuat akun terkonfirmasi dan profil mahasiswa tanpa menerima peran dari klien", async () => {
    expect(
      await registerStudent(
        { ...input, role: "admin", organizationId: "other" },
        "127.0.0.1",
      ),
    ).toEqual({ ok: true });
    expect(mocks.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ email_confirm: true, email: input.email }),
    );
    expect(mocks.rpc).toHaveBeenCalledWith("register_student_profile", {
      p_user_id: studentId,
      p_organization_id: organizationId,
      p_full_name: input.fullName,
      p_identifier: input.identifier,
    });
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });
  it("menyimpan hash IP dan surel, bukan nilai mentah", async () => {
    await registerStudent(input, "127.0.0.1");
    const args = mocks.rpc.mock.calls[0]![1] as Record<string, string>;
    expect(args.p_ip_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(args.p_email_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(args)).not.toContain(input.email);
    expect(JSON.stringify(args)).not.toContain("127.0.0.1");
  });
  it("menolak domain tiruan sebelum RPC dan Auth API", async () => {
    expect(
      (
        await registerStudent(
          { ...input, email: "mhs@student.unismuh.ac.id.evil.com" },
          "127.0.0.1",
        )
      ).ok,
    ).toBe(false);
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.createUser).not.toHaveBeenCalled();
  });
  it("menolak konfigurasi organisasi yang belum tersedia", async () => {
    vi.stubEnv("STUDENT_REGISTRATION_ORGANIZATION_ID", "");
    expect(await registerStudent(input, "127.0.0.1")).toEqual({
      ok: false,
      error: REGISTRATION_UNAVAILABLE,
    });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("menolak bila signup publik Supabase masih aktif", async () => {
    mocks.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ disable_signup: false }),
    });
    expect((await registerStudent(input, "127.0.0.1")).ok).toBe(false);
    expect(mocks.createUser).not.toHaveBeenCalled();
  });
  it("menolak bila setelan Supabase tidak dapat diverifikasi", async () => {
    mocks.fetch.mockRejectedValue(new Error("network failure"));
    expect((await registerStudent(input, "127.0.0.1")).ok).toBe(false);
    expect(mocks.createUser).not.toHaveBeenCalled();
  });
  it.each([
    { data: false, error: null },
    { data: null, error: { code: "XX000" } },
  ])("gagal tertutup saat batas pendaftaran bermasalah", async (result) => {
    mocks.rpc.mockResolvedValue(result);
    expect((await registerStudent(input, "127.0.0.1")).ok).toBe(false);
    expect(mocks.createUser).not.toHaveBeenCalled();
  });
  it("NIM terdaftar tidak diambil alih", async () => {
    mocks.from.mockReturnValue(
      query({ data: { id: "existing" }, error: null }),
    );
    expect((await registerStudent(input, "127.0.0.1")).ok).toBe(false);
    expect(mocks.createUser).not.toHaveBeenCalled();
  });
  it("menghapus akun baru jika transaksi profil gagal", async () => {
    mocks.rpc.mockImplementation(async (name: string) =>
      name === "consume_registration_limit"
        ? { data: true, error: null }
        : { data: null, error: { code: "23505" } },
    );
    expect((await registerStudent(input, "127.0.0.1")).ok).toBe(false);
    expect(mocks.deleteUser).toHaveBeenCalledWith(studentId);
  });
  it("akun yang sudah ada tidak dihapus bila Auth menolak", async () => {
    mocks.createUser.mockResolvedValue({
      data: { user: null },
      error: { code: "email_exists" },
    });
    expect((await registerStudent(input, "127.0.0.1")).ok).toBe(false);
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });
  it("tidak mempercayai x-forwarded-for yang dapat dikirim klien di Vercel", () => {
    vi.stubEnv("VERCEL", "1");
    expect(
      registrationClientIp(new Headers({ "x-forwarded-for": "203.0.113.1" })),
    ).toBeNull();
    expect(
      registrationClientIp(
        new Headers({
          "x-vercel-forwarded-for": "203.0.113.2",
          "x-forwarded-for": "203.0.113.1",
        }),
      ),
    ).toBe("203.0.113.2");
  });
});
