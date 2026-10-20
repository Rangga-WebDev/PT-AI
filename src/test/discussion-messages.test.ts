/** @format */

// @vitest-environment node

import { describe, expect, it } from "vitest";

import {
  formatMessageTime,
  mergeMessage,
  toClassMessageView,
  type ClassMessageRow,
} from "@/lib/discussion/messages";
import { classMessageSchema } from "@/lib/validation/discussion";

const CLASS_ID = "11111111-1111-4111-8111-111111111111";
const MODULE_ID = "22222222-2222-4222-8222-222222222222";

function row(overrides: Partial<ClassMessageRow> = {}): ClassMessageRow {
  return {
    id: "m1",
    class_id: CLASS_ID,
    module_id: null,
    author_id: "u1",
    author_name: "Mahasiswa Uji",
    author_role: "student",
    body: "Halo",
    deleted_at: null,
    created_at: "2026-10-20T02:15:00+00:00",
    ...overrides,
  };
}

describe("toClassMessageView", () => {
  it("memetakan baris menjadi tampilan", () => {
    expect(toClassMessageView(row({ author_role: "lecturer" }))).toEqual({
      id: "m1",
      classId: CLASS_ID,
      moduleId: null,
      authorId: "u1",
      authorName: "Mahasiswa Uji",
      authorRole: "lecturer",
      body: "Halo",
      deleted: false,
      createdAt: "2026-10-20T02:15:00+00:00",
    });
  });

  it("tidak meneruskan isi pesan yang dihapus", () => {
    const view = toClassMessageView(
      row({ body: "masih tersisa", deleted_at: "2026-10-20T03:00:00+00:00" }),
    );
    expect(view.deleted).toBe(true);
    expect(view.body).toBe("");
  });
});

describe("mergeMessage", () => {
  const first = toClassMessageView(
    row({ id: "a", created_at: "2026-10-20T01:00:00Z" }),
  );
  const second = toClassMessageView(
    row({ id: "b", created_at: "2026-10-20T02:00:00Z" }),
  );

  it("tidak menggandakan pesan yang tiba dua kali", () => {
    expect(mergeMessage([first, second], second)).toHaveLength(2);
  });

  it("menyisipkan pesan sesuai urutan waktu", () => {
    expect(mergeMessage([second], first).map((item) => item.id)).toEqual([
      "a",
      "b",
    ]);
  });

  it("mengganti pesan yang berubah status", () => {
    const deleted = { ...first, deleted: true, body: "" };
    expect(mergeMessage([first, second], deleted)[0]).toEqual(deleted);
  });
});

describe("formatMessageTime", () => {
  it("menampilkan waktu WITA", () => {
    expect(formatMessageTime("2026-10-20T02:15:00+00:00")).toBe(
      "20 Okt, 10.15",
    );
  });

  it("berganti tanggal sesuai WITA", () => {
    expect(formatMessageTime("2026-10-20T17:30:00Z")).toBe("21 Okt, 01.30");
  });
});

describe("classMessageSchema", () => {
  it("memangkas isi dan menerima diskusi kelas tanpa pertemuan", () => {
    const parsed = classMessageSchema.parse({
      classId: CLASS_ID,
      moduleId: null,
      body: "  Pertanyaan  ",
    });
    expect(parsed.body).toBe("Pertanyaan");
  });

  it("menolak pesan kosong", () => {
    const result = classMessageSchema.safeParse({
      classId: CLASS_ID,
      moduleId: MODULE_ID,
      body: "   ",
    });
    expect(result.success).toBe(false);
  });

  it("menolak pesan lebih dari 2000 karakter", () => {
    const result = classMessageSchema.safeParse({
      classId: CLASS_ID,
      moduleId: null,
      body: "a".repeat(2001),
    });
    expect(result.success).toBe(false);
  });
});
