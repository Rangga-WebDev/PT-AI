/** @format */

// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthorizationError } from "@/lib/errors";

const mocks = vi.hoisted(() => ({
  role: vi.fn(),
  lecturerOfClass: vi.fn(),
  currentUser: vi.fn(),
  rateLimit: vi.fn(),
  resetAsAdmin: vi.fn(),
  resetAsLecturer: vi.fn(),
  clearFlag: vi.fn(),
  updateUser: vi.fn(),
  verifySignIn: vi.fn(),
  verifySignOut: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT ${path}`);
  }),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/supabase/auth", () => ({
  requireRoleOrThrow: mocks.role,
  requireAdminAccess: mocks.role,
  requireLecturerOfClass: mocks.lecturerOfClass,
  getCurrentUser: mocks.currentUser,
  landingPathForRoles: () => "/app/student/dashboard",
}));
vi.mock("@/server/services/rate-limit", () => ({
  consumeRateLimit: mocks.rateLimit,
  RATE_LIMIT_MESSAGE: { password_reset: "Terlalu banyak pengaturan ulang." },
}));
vi.mock("@/server/services/password-reset", () => ({
  resetPasswordAsAdmin: mocks.resetAsAdmin,
  resetStudentPasswordAsLecturer: mocks.resetAsLecturer,
  clearPasswordChangeRequirement: mocks.clearFlag,
}));
vi.mock("@/server/services/account-service", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { updateUser: mocks.updateUser } }),
}));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: { signInWithPassword: mocks.verifySignIn, signOut: mocks.verifySignOut },
  }),
}));

import { resetUserPasswordAction } from "@/actions/administration/accounts";
import { changePassword } from "@/actions/auth/change-password";
import { resetStudentPasswordAction } from "@/actions/courses/student-password";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const CLASS_ID = "22222222-2222-4222-8222-222222222222";

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

function user(mustChangePassword: boolean) {
  return {
    id: "user-1",
    email: "mahasiswa@gmail.com",
    roles: ["student"],
    mustChangePassword,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.role.mockResolvedValue({ id: "admin-1", organizationId: "org-1" });
  mocks.lecturerOfClass.mockResolvedValue({ id: "lecturer-1" });
  mocks.rateLimit.mockResolvedValue(true);
  mocks.resetAsAdmin.mockResolvedValue("Ptai-ABCD-EFGH-JK23");
  mocks.resetAsLecturer.mockResolvedValue("Ptai-ABCD-EFGH-JK23");
  mocks.updateUser.mockResolvedValue({ error: null });
  mocks.verifySignIn.mockResolvedValue({ error: null });
  mocks.verifySignOut.mockResolvedValue({ error: null });
});

describe("resetUserPasswordAction", () => {
  it("mengembalikan kata sandi sementara untuk administrator", async () => {
    expect(await resetUserPasswordAction(USER_ID)).toEqual({
      temporaryPassword: "Ptai-ABCD-EFGH-JK23",
    });
    expect(mocks.role).toHaveBeenCalledWith("admin");
    expect(mocks.resetAsAdmin).toHaveBeenCalledWith({
      actorId: "admin-1",
      organizationId: "org-1",
      targetId: USER_ID,
    });
  });

  it("menolak pengguna yang bukan administrator", async () => {
    mocks.role.mockRejectedValue(new AuthorizationError());
    const result = await resetUserPasswordAction(USER_ID);
    expect(result.error).toBeTruthy();
    expect(mocks.resetAsAdmin).not.toHaveBeenCalled();
  });

  it("menghormati batas laju", async () => {
    mocks.rateLimit.mockResolvedValue(false);
    expect(await resetUserPasswordAction(USER_ID)).toEqual({
      error: "Terlalu banyak pengaturan ulang.",
    });
  });
});

describe("resetStudentPasswordAction", () => {
  it("memeriksa dosen pengampu kelas sebelum mengatur ulang", async () => {
    expect(await resetStudentPasswordAction(CLASS_ID, USER_ID)).toEqual({
      temporaryPassword: "Ptai-ABCD-EFGH-JK23",
    });
    expect(mocks.lecturerOfClass).toHaveBeenCalledWith(CLASS_ID);
    expect(mocks.resetAsLecturer).toHaveBeenCalledWith({
      actorId: "lecturer-1",
      classId: CLASS_ID,
      studentId: USER_ID,
    });
  });

  it("menolak dosen di luar kelas", async () => {
    mocks.lecturerOfClass.mockRejectedValue(new AuthorizationError());
    const result = await resetStudentPasswordAction(CLASS_ID, USER_ID);
    expect(result.error).toBeTruthy();
    expect(mocks.resetAsLecturer).not.toHaveBeenCalled();
  });

  it("menolak id yang tidak sah", async () => {
    expect(await resetStudentPasswordAction("kelas", USER_ID)).toEqual({
      error: "Data mahasiswa tidak valid.",
    });
  });
});

describe("changePassword", () => {
  const fresh = { password: "kata-sandi-baru-123", confirmPassword: "kata-sandi-baru-123" };

  it("pengguna dengan kata sandi sementara tidak ditanya kata sandi lama", async () => {
    mocks.currentUser.mockResolvedValue(user(true));

    await expect(changePassword({}, form(fresh))).rejects.toThrow(
      "REDIRECT /app/student/dashboard",
    );
    expect(mocks.verifySignIn).not.toHaveBeenCalled();
    expect(mocks.updateUser).toHaveBeenCalledWith({ password: fresh.password });
    expect(mocks.clearFlag).toHaveBeenCalledWith("user-1");
  });

  it("penggantian biasa mewajibkan kata sandi saat ini", async () => {
    mocks.currentUser.mockResolvedValue(user(false));

    const result = await changePassword({}, form(fresh));

    expect(result.fieldErrors?.["currentPassword"]?.[0]).toBe(
      "Kata sandi saat ini wajib diisi.",
    );
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });

  it("menolak kata sandi saat ini yang salah", async () => {
    mocks.currentUser.mockResolvedValue(user(false));
    mocks.verifySignIn.mockResolvedValue({ error: { status: 400 } });

    const result = await changePassword(
      {},
      form({ ...fresh, currentPassword: "salah-total" }),
    );

    expect(result.fieldErrors?.["currentPassword"]?.[0]).toBe(
      "Kata sandi saat ini salah.",
    );
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });

  it("mengganti kata sandi setelah kata sandi lama terbukti benar", async () => {
    mocks.currentUser.mockResolvedValue(user(false));

    const result = await changePassword(
      {},
      form({ ...fresh, currentPassword: "kata-sandi-lama-123" }),
    );

    expect(result).toEqual({ success: true });
    expect(mocks.verifySignIn).toHaveBeenCalledWith({
      email: "mahasiswa@gmail.com",
      password: "kata-sandi-lama-123",
    });
    expect(mocks.verifySignOut).toHaveBeenCalledWith({ scope: "local" });
    expect(mocks.clearFlag).not.toHaveBeenCalled();
  });

  it("menjelaskan kata sandi baru yang sama dengan yang lama", async () => {
    mocks.currentUser.mockResolvedValue(user(true));
    mocks.updateUser.mockResolvedValue({ error: { code: "same_password" } });

    expect(await changePassword({}, form(fresh))).toEqual({
      error: "Kata sandi baru harus berbeda dari kata sandi lama.",
    });
    expect(mocks.clearFlag).not.toHaveBeenCalled();
  });
});
