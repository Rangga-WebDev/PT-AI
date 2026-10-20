/** @format */

// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  rateLimit: vi.fn(),
  insert: vi.fn(),
  single: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/auth", () => ({ requireUserOrThrow: mocks.user }));
vi.mock("@/server/services/rate-limit", () => ({
  consumeRateLimit: mocks.rateLimit,
  RATE_LIMIT_MESSAGE: { class_message: "Terlalu banyak pesan." },
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: () => ({
      insert: (row: unknown) => {
        mocks.insert(row);
        return { select: () => ({ single: mocks.single }) };
      },
    }),
    rpc: mocks.rpc,
  }),
}));

import {
  deleteClassMessageAction,
  sendClassMessageAction,
} from "@/actions/courses/discussion";

const CLASS_ID = "11111111-1111-4111-8111-111111111111";
const MODULE_ID = "22222222-2222-4222-8222-222222222222";
const MESSAGE_ID = "33333333-3333-4333-8333-333333333333";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.user.mockResolvedValue({ id: "student" });
  mocks.rateLimit.mockResolvedValue(true);
});

describe("sendClassMessageAction", () => {
  it("mengirim hanya kelas, pertemuan, dan isi; identitas diisi basis data", async () => {
    mocks.single.mockResolvedValue({
      error: null,
      data: {
        id: MESSAGE_ID,
        class_id: CLASS_ID,
        module_id: MODULE_ID,
        author_id: "student",
        author_name: "Mahasiswa",
        author_role: "student",
        body: "Halo",
        deleted_at: null,
        created_at: "2026-10-20T02:00:00Z",
      },
    });

    const result = await sendClassMessageAction({
      classId: CLASS_ID,
      moduleId: MODULE_ID,
      body: "  Halo  ",
      authorId: "palsu",
    });

    expect(mocks.insert).toHaveBeenCalledWith({
      class_id: CLASS_ID,
      module_id: MODULE_ID,
      body: "Halo",
    });
    expect(result).toMatchObject({
      ok: true,
      message: { id: MESSAGE_ID, authorName: "Mahasiswa", body: "Halo" },
    });
  });

  it("menolak pesan kosong tanpa menyentuh basis data", async () => {
    const result = await sendClassMessageAction({
      classId: CLASS_ID,
      moduleId: null,
      body: "   ",
    });

    expect(result).toEqual({ ok: false, error: "Pesan tidak boleh kosong." });
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("menghormati batas laju", async () => {
    mocks.rateLimit.mockResolvedValue(false);

    const result = await sendClassMessageAction({
      classId: CLASS_ID,
      moduleId: null,
      body: "Halo",
    });

    expect(result).toEqual({ ok: false, error: "Terlalu banyak pesan." });
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("menerjemahkan penolakan RLS menjadi pesan yang dapat dipahami", async () => {
    mocks.single.mockResolvedValue({ error: { code: "42501" }, data: null });

    const result = await sendClassMessageAction({
      classId: CLASS_ID,
      moduleId: null,
      body: "Halo",
    });

    expect(result).toEqual({
      ok: false,
      error: "Anda tidak dapat mengirim pesan di diskusi ini.",
    });
  });
});

describe("deleteClassMessageAction", () => {
  it("memanggil fungsi penghapusan dengan id pesan", async () => {
    mocks.rpc.mockResolvedValue({ error: null });

    expect(await deleteClassMessageAction(MESSAGE_ID)).toEqual({ ok: true });
    expect(mocks.rpc).toHaveBeenCalledWith("delete_class_message", {
      p_message_id: MESSAGE_ID,
    });
  });

  it("menolak id yang tidak sah", async () => {
    expect(await deleteClassMessageAction("bukan-uuid")).toEqual({
      error: "Pesan tidak valid.",
    });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("menjelaskan penolakan wewenang", async () => {
    mocks.rpc.mockResolvedValue({ error: { code: "42501" } });

    expect(await deleteClassMessageAction(MESSAGE_ID)).toEqual({
      error: "Anda tidak berwenang menghapus pesan ini.",
    });
  });
});
