/** @format */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  generate: vi.fn(),
  save: vi.fn(),
  apply: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}));
vi.mock("@/actions/courses/unit-plan", () => ({
  generateUnitPlanAction: mocks.generate,
  saveUnitPlanAction: mocks.save,
  applyUnitPlanAction: mocks.apply,
}));

import { UnitPlanLauncher } from "@/features/course-builder/components/unit-plan-launcher";
import { UnitPlanReview } from "@/features/course-builder/components/unit-plan-review";
import { unitPlanSchema, type UnitPlanDraftView } from "@/lib/ai/unit-plan";
import { fakeProvider } from "@/server/ai/fake-provider";

const classId = "11111111-1111-4111-8111-111111111111";
const moduleId = "22222222-2222-4222-8222-222222222222";
const resourceId = "33333333-3333-4333-8333-333333333333";
const draftId = "44444444-4444-4444-8444-444444444444";
const plan = unitPlanSchema.parse(
  JSON.parse(
    (
      await fakeProvider.generateStructured({
        systemInstruction: "",
        prompt:
          "=== RENCANA ENAM UNIT ===\n=== ISI DOKUMEN ===\nPartisipasi warga harus memakai bukti yang dapat diverifikasi.\n=== AKHIR DOKUMEN ===",
        schema: {},
      })
    ).text,
  ),
);
const draft: UnitPlanDraftView = {
  id: draftId,
  status: "draft",
  updatedAt: "2026-09-25T00:00:00Z",
  createdAt: "2026-09-25T00:00:00Z",
  model: "fake",
  promptVersion: 1,
  meta: {
    kind: "six_unit_plan",
    moduleId,
    moduleTitle: "Pertemuan 1",
    resourceTitle: "RPS PKn",
    sourceTextHash: "a".repeat(64),
    truncated: false,
  },
  plan,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.save.mockResolvedValue({ ok: true, updatedAt: "2026-09-25T00:01:00Z" });
  mocks.apply.mockResolvedValue({
    ok: true,
    alreadyApplied: false,
    unitIds: Array.from(
      { length: 6 },
      (_, index) => `55555555-5555-4555-8555-55555555555${index}`,
    ),
  });
});

describe("pembuatan enam unit untuk dosen", () => {
  it("menyediakan jalan ke materi bila dokumen belum ada", () => {
    render(
      <UnitPlanLauncher
        classId={classId}
        modules={[{ id: moduleId, label: "Pertemuan 1" }]}
        documents={[]}
      />,
    );
    expect(screen.getByRole("link", { name: "Tambah materi" })).toHaveAttribute(
      "href",
      `/app/lecturer/classes/${classId}/materials`,
    );
    expect(
      screen.queryByRole("button", { name: /Buat 6/ }),
    ).not.toBeInTheDocument();
  });
  it("mengirim pertemuan dan materi lalu membuka tinjauan", async () => {
    mocks.generate.mockResolvedValue({
      ok: true,
      redirectTo: `/app/lecturer/classes/${classId}/builder/drafts/${draftId}`,
    });
    render(
      <UnitPlanLauncher
        classId={classId}
        modules={[{ id: moduleId, label: "Pertemuan 1" }]}
        documents={[{ id: resourceId, title: "RPS" }]}
      />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Buat 6 unit dengan AI" }),
    );
    await waitFor(() =>
      expect(mocks.push).toHaveBeenCalledWith(
        `/app/lecturer/classes/${classId}/builder/drafts/${draftId}`,
      ),
    );
    const data = mocks.generate.mock.calls[0]![1] as FormData;
    expect(data.get("moduleId")).toBe(moduleId);
    expect(data.get("resourceId")).toBe(resourceId);
  });
  it("tidak menerapkan otomatis sebelum dosen meninjau", async () => {
    render(<UnitPlanReview classId={classId} draft={draft} />);
    expect(
      screen.getByRole("button", { name: "Setujui dan buat 6 unit" }),
    ).toBeDisabled();
    expect(mocks.apply).not.toHaveBeenCalled();
    await userEvent.click(
      screen.getByRole("checkbox", {
        name: "Saya sudah meninjau keenam unit dan kasusnya.",
      }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Setujui dan buat 6 unit" }),
    );
    expect(
      await screen.findByText(
        "Enam unit dibuat sebagai draf, beserta enam kasus dan 36 aktivitas.",
      ),
    ).toBeInTheDocument();
    expect(mocks.apply).toHaveBeenCalledWith({
      classId,
      draftId,
      expectedUpdatedAt: draft.updatedAt,
    });
    expect(
      screen.getByRole("link", { name: "Buka struktur kelas" }),
    ).toBeVisible();
  });
  it("suntingan wajib disimpan sebelum disetujui", async () => {
    const user = userEvent.setup();
    render(<UnitPlanReview classId={classId} draft={draft} />);
    await user.click(screen.getByRole("checkbox"));
    await user.clear(screen.getByLabelText("Judul unit 1"));
    await user.paste("Judul pilihan dosen");
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    expect(
      screen.getByRole("button", { name: "Setujui dan buat 6 unit" }),
    ).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Simpan perubahan" }));
    expect(await screen.findByText("Perubahan draf tersimpan.")).toBeVisible();
    await waitFor(() => expect(screen.getByRole("checkbox")).toBeEnabled());
    await user.click(screen.getByRole("checkbox"));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Setujui dan buat 6 unit" }),
      ).toBeEnabled(),
    );
    await user.click(
      screen.getByRole("button", { name: "Setujui dan buat 6 unit" }),
    );
    await waitFor(() =>
      expect(mocks.apply).toHaveBeenCalledWith({
        classId,
        draftId,
        expectedUpdatedAt: "2026-09-25T00:01:00Z",
      }),
    );
  });
  it("kegagalan penerapan tidak ditampilkan sebagai sukses", async () => {
    mocks.apply.mockResolvedValue({ error: "Materi sumber berubah." });
    render(<UnitPlanReview classId={classId} draft={draft} />);
    await userEvent.click(screen.getByRole("checkbox"));
    await userEvent.click(
      screen.getByRole("button", { name: "Setujui dan buat 6 unit" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Materi sumber berubah.",
    );
    expect(
      screen.queryByRole("link", { name: "Buka struktur kelas" }),
    ).not.toBeInTheDocument();
  });
  it("rancangan yang sudah diterapkan tidak dapat disunting kembali", () => {
    render(
      <UnitPlanReview
        classId={classId}
        draft={{ ...draft, status: "approved" }}
      />,
    );
    expect(screen.getByLabelText("Judul unit 1")).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "Setujui dan buat 6 unit" }),
    ).not.toBeInTheDocument();
  });
});
