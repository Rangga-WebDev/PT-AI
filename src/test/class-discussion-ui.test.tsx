/** @format */

import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ClassMessageView } from "@/lib/discussion/messages";

type Handler = (payload: { new: unknown }) => void;

const mocks = vi.hoisted(() => ({
  handlers: [] as { event: string; handler: Handler }[],
  removeChannel: vi.fn(),
  send: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => {
    const channel = {
      on: (_type: string, filter: { event: string }, handler: Handler) => {
        mocks.handlers.push({ event: filter.event, handler });
        return channel;
      },
      subscribe: (callback?: (status: string) => void) => {
        callback?.("SUBSCRIBED");
        return channel;
      },
    };
    return {
      channel: () => channel,
      removeChannel: mocks.removeChannel,
      auth: { getSession: async () => ({ data: { session: null } }) },
    };
  },
}));

vi.mock("@/actions/courses/discussion", () => ({
  sendClassMessageAction: (input: unknown) => mocks.send(input),
  deleteClassMessageAction: (id: unknown) => mocks.remove(id),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

import { ClassDiscussion } from "@/features/discussion/components/class-discussion";

const CLASS_ID = "11111111-1111-4111-8111-111111111111";
const MODULE_ID = "22222222-2222-4222-8222-222222222222";
const ME = "student-me";

function message(overrides: Partial<ClassMessageView> = {}): ClassMessageView {
  return {
    id: "m1",
    classId: CLASS_ID,
    moduleId: null,
    authorId: "lecturer-1",
    authorName: "Dosen Pengampu",
    authorRole: "lecturer",
    body: "Selamat datang di diskusi.",
    deleted: false,
    createdAt: "2026-10-20T01:00:00Z",
    ...overrides,
  };
}

const THREADS = [
  { id: null, label: "Diskusi kelas", href: "/d", draft: false },
  {
    id: MODULE_ID,
    label: "Pertemuan 1 · Hak warga",
    href: `/d?pertemuan=${MODULE_ID}`,
    draft: false,
  },
];

function renderDiscussion(
  props: Partial<ComponentProps<typeof ClassDiscussion>> = {},
) {
  return render(
    <ClassDiscussion
      classId={CLASS_ID}
      moduleId={null}
      threads={THREADS}
      initialMessages={[
        message(),
        message({
          id: "m2",
          authorId: ME,
          authorName: "Mahasiswa Saya",
          authorRole: "student",
          body: "Terima kasih, Bu.",
          createdAt: "2026-10-20T01:05:00Z",
        }),
        message({
          id: "m3",
          authorId: "student-2",
          authorName: "Mahasiswa Lain",
          authorRole: "student",
          body: "",
          deleted: true,
          createdAt: "2026-10-20T01:06:00Z",
        }),
      ]}
      currentUserId={ME}
      canModerate={false}
      {...props}
    />,
  );
}

function emit(event: "INSERT" | "UPDATE", row: Record<string, unknown>) {
  act(() => {
    for (const entry of mocks.handlers) {
      if (entry.event === event) entry.handler({ new: row });
    }
  });
}

const row = (overrides: Record<string, unknown> = {}) => ({
  id: "m9",
  class_id: CLASS_ID,
  module_id: null,
  author_id: "student-2",
  author_name: "Mahasiswa Lain",
  author_role: "student",
  body: "Pesan baru dari realtime.",
  deleted_at: null,
  created_at: "2026-10-20T02:00:00Z",
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.handlers.length = 0;
});

describe("ClassDiscussion", () => {
  it("menampilkan penulis, peran dosen, dan pesan yang dihapus", () => {
    renderDiscussion();

    expect(screen.getByText("Dosen Pengampu")).toBeInTheDocument();
    expect(screen.getByText("Dosen")).toBeInTheDocument();
    expect(screen.getByText("Mahasiswa Saya (Anda)")).toBeInTheDocument();
    expect(screen.getByText("Pesan dihapus.")).toBeInTheDocument();
  });

  it("mahasiswa hanya dapat menghapus pesannya sendiri", () => {
    renderDiscussion();

    expect(screen.getAllByRole("button", { name: "Hapus" })).toHaveLength(1);
  });

  it("dosen dapat menghapus pesan siapa pun yang belum dihapus", () => {
    renderDiscussion({ canModerate: true, currentUserId: "lecturer-1" });

    expect(screen.getAllByRole("button", { name: "Hapus" })).toHaveLength(2);
  });

  it("mengirim pesan dan menampilkannya tanpa menunggu realtime", async () => {
    mocks.send.mockResolvedValue({
      ok: true,
      message: message({
        id: "m4",
        authorId: ME,
        authorName: "Mahasiswa Saya",
        authorRole: "student",
        body: "Pertanyaan saya.",
        createdAt: "2026-10-20T01:10:00Z",
      }),
    });
    const user = userEvent.setup();
    renderDiscussion();

    await user.type(screen.getByLabelText("Tulis pesan"), "Pertanyaan saya.");
    await user.click(screen.getByRole("button", { name: "Kirim" }));

    expect(mocks.send).toHaveBeenCalledWith({
      classId: CLASS_ID,
      moduleId: null,
      body: "Pertanyaan saya.",
    });
    expect(await screen.findByText("Pertanyaan saya.")).toBeInTheDocument();
    expect(screen.getByLabelText("Tulis pesan")).toHaveValue("");
  });

  it("Enter mengirim, Shift+Enter menambah baris", async () => {
    mocks.send.mockResolvedValue({ ok: false, error: "Gagal." });
    const user = userEvent.setup();
    renderDiscussion();
    const input = screen.getByLabelText("Tulis pesan");

    await user.type(input, "Baris satu{Shift>}{Enter}{/Shift}baris dua");
    expect(mocks.send).not.toHaveBeenCalled();

    await user.type(input, "{Enter}");
    expect(mocks.send).toHaveBeenCalledWith(
      expect.objectContaining({ body: "Baris satu\nbaris dua" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("Gagal.");
  });

  it("menampilkan pesan baru dari anggota lain secara langsung", () => {
    renderDiscussion();

    emit("INSERT", row());

    expect(screen.getByText("Pesan baru dari realtime.")).toBeInTheDocument();
  });

  it("mengabaikan pesan untuk ruang diskusi lain", () => {
    renderDiscussion();

    emit("INSERT", row({ module_id: MODULE_ID, body: "Untuk pertemuan 1." }));

    expect(screen.queryByText("Untuk pertemuan 1.")).not.toBeInTheDocument();
  });

  it("menandai pesan yang dihapus anggota lain", () => {
    renderDiscussion();

    emit(
      "UPDATE",
      row({ id: "m1", body: "", deleted_at: "2026-10-20T03:00:00Z" }),
    );

    expect(
      screen.queryByText("Selamat datang di diskusi."),
    ).not.toBeInTheDocument();
    expect(screen.getAllByText("Pesan dihapus.")).toHaveLength(2);
  });

  it("meminta konfirmasi sebelum menghapus", async () => {
    mocks.remove.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    renderDiscussion();

    await user.click(screen.getByRole("button", { name: "Hapus" }));
    expect(mocks.remove).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Ya, hapus" }));

    expect(mocks.remove).toHaveBeenCalledWith("m2");
    expect(screen.queryByText("Terima kasih, Bu.")).not.toBeInTheDocument();
  });

  it("melepas langganan saat ditutup", () => {
    const { unmount } = renderDiscussion();
    unmount();
    expect(mocks.removeChannel).toHaveBeenCalled();
  });
});
