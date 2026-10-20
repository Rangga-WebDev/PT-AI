/** @format */

// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  profile: null as { organization_id: string } | null,
  roles: [] as string[],
  enrollment: null as { id: string } | null,
  updateUserById: vi.fn(),
  audits: [] as { action: string; subjectId?: string }[],
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/admin", () => {
  const maybeSingle = (table: string) => async () => ({
    data: table === "profiles" ? mocks.profile : mocks.enrollment,
  });

  const client = {
    from(table: string) {
      const chain = {
        select: () => chain,
        eq: () => chain,
        is: async () => ({
          data: mocks.roles.map((key) => ({ roles: { key } })),
        }),
        maybeSingle: maybeSingle(table),
      };
      return chain;
    },
    auth: { admin: { updateUserById: mocks.updateUserById } },
  };

  return {
    createAdminClient: () => client,
    withAuditedAdmin: async (
      context: { action: string; subjectId?: string },
      operation: (admin: typeof client) => Promise<unknown>,
    ) => {
      mocks.audits.push(context);
      return operation(client);
    },
  };
});

const {
  clearPasswordChangeRequirement,
  generateTemporaryPassword,
  resetPasswordAsAdmin,
  resetStudentPasswordAsLecturer,
} = await import("@/server/services/password-reset");

beforeEach(() => {
  vi.clearAllMocks();
  mocks.profile = { organization_id: "org-1" };
  mocks.roles = ["student"];
  mocks.enrollment = { id: "enrollment-1" };
  mocks.audits.length = 0;
  mocks.updateUserById.mockResolvedValue({ error: null });
});

describe("generateTemporaryPassword", () => {
  it("mudah didiktekan dan memenuhi panjang minimum", () => {
    for (let index = 0; index < 200; index += 1) {
      const password = generateTemporaryPassword();
      expect(password).toMatch(
        /^Ptai-[A-HJ-KM-NP-Z2-9]{4}-[A-HJ-KM-NP-Z2-9]{4}-[A-HJ-KM-NP-Z2-9]{4}$/,
      );
      expect(password).toMatch(/[2-9]/);
      expect(password.length).toBeGreaterThanOrEqual(12);
    }
  });

  it("tidak mengulang kata sandi yang sama", () => {
    const passwords = new Set(
      Array.from({ length: 200 }, () => generateTemporaryPassword()),
    );
    expect(passwords.size).toBe(200);
  });
});

describe("resetPasswordAsAdmin", () => {
  const params = { actorId: "admin-1", organizationId: "org-1", targetId: "user-1" };

  it("memasang kata sandi sementara yang wajib diganti", async () => {
    const password = await resetPasswordAsAdmin(params);

    expect(mocks.updateUserById).toHaveBeenCalledWith("user-1", {
      password,
      app_metadata: { must_change_password: true },
    });
    expect(mocks.audits).toEqual([
      expect.objectContaining({
        action: "account.password_reset.admin",
        subjectId: "user-1",
      }),
    ]);
  });

  it("dapat mengatur ulang kata sandi dosen", async () => {
    mocks.roles = ["lecturer"];
    await expect(resetPasswordAsAdmin(params)).resolves.toMatch(/^Ptai-/);
  });

  it("menolak pengguna dari organisasi lain", async () => {
    mocks.profile = { organization_id: "org-2" };
    await expect(resetPasswordAsAdmin(params)).rejects.toThrow();
    expect(mocks.updateUserById).not.toHaveBeenCalled();
  });

  it("menolak akun administrator", async () => {
    mocks.roles = ["lecturer", "admin"];
    await expect(resetPasswordAsAdmin(params)).rejects.toThrow();
    expect(mocks.updateUserById).not.toHaveBeenCalled();
  });

  it("menolak mengatur ulang akun sendiri", async () => {
    await expect(
      resetPasswordAsAdmin({ ...params, targetId: "admin-1" }),
    ).rejects.toThrow();
  });
});

describe("resetStudentPasswordAsLecturer", () => {
  const params = { actorId: "lecturer-1", classId: "class-1", studentId: "student-1" };

  it("mengatur ulang mahasiswa aktif di kelas", async () => {
    const password = await resetStudentPasswordAsLecturer(params);

    expect(mocks.updateUserById).toHaveBeenCalledWith("student-1", {
      password,
      app_metadata: { must_change_password: true },
    });
    expect(mocks.audits[0]?.action).toBe("account.password_reset.lecturer");
  });

  it("menolak mahasiswa yang tidak terdaftar di kelas", async () => {
    mocks.enrollment = null;
    await expect(resetStudentPasswordAsLecturer(params)).rejects.toThrow(
      "Mahasiswa tidak terdaftar aktif di kelas ini.",
    );
  });

  it("menolak akun yang juga dosen atau administrator", async () => {
    mocks.roles = ["student", "lecturer"];
    await expect(resetStudentPasswordAsLecturer(params)).rejects.toThrow();
    expect(mocks.updateUserById).not.toHaveBeenCalled();
  });
});

describe("clearPasswordChangeRequirement", () => {
  it("mencabut penanda wajib ganti", async () => {
    await clearPasswordChangeRequirement("user-1");
    expect(mocks.updateUserById).toHaveBeenCalledWith("user-1", {
      app_metadata: { must_change_password: false },
    });
  });
});
