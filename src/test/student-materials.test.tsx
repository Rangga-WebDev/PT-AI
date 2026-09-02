/** @format */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { MaterialView } from "@/lib/materials/types";

const requestMaterialDownloadAction = vi.fn();

vi.mock("@/actions/courses/materials", () => ({
  requestMaterialDownloadAction: (id: string) =>
    requestMaterialDownloadAction(id),
}));

const { StudentMaterialList } =
  await import("@/features/materials/components/student-material-list");

const CLASS_ID = "11111111-1111-4111-8111-111111111111";

function material(overrides: Partial<MaterialView> = {}): MaterialView {
  return {
    id: "22222222-2222-4222-8222-222222222222",
    title: "RPS Pendidikan Kewarganegaraan",
    description: null,
    resourceType: "file",
    materialKind: "rps",
    status: "published",
    visibility: "student",
    sequence: 1,
    url: null,
    hasFile: true,
    mimeType: "application/pdf",
    sizeBytes: 204_800,
    originalFilename: "rps.pdf",
    extractionStatus: "succeeded",
    extractedAt: "2026-09-01T00:00:00.000Z",
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  requestMaterialDownloadAction.mockResolvedValue({
    ok: true,
    download: {
      url: "https://signed.example/x",
      filename: "rps.pdf",
      expiresInSeconds: 300,
    },
  });
  vi.stubGlobal("open", vi.fn());
});

describe("daftar materi mahasiswa", () => {
  it("menampilkan judul, jenis, dan tanggal", () => {
    render(<StudentMaterialList classId={CLASS_ID} materials={[material()]} />);

    expect(
      screen.getAllByText("RPS Pendidikan Kewarganegaraan").length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("PDF").length).toBeGreaterThan(0);
  });

  // Mahasiswa tidak butuh istilah pengelolaan maupun detail penyimpanan.
  it("tidak membocorkan status, ekstraksi, checksum, atau kunci objek", () => {
    const { container } = render(
      <StudentMaterialList classId={CLASS_ID} materials={[material()]} />,
    );

    const text = container.textContent ?? "";
    for (const leak of [
      "Terbit",
      "Draf",
      "Teks siap",
      "Menunggu pembacaan",
      "rps.pdf",
      "succeeded",
      CLASS_ID,
    ]) {
      expect(text).not.toContain(leak);
    }
  });

  it("meminta tautan bertanda tangan lewat server untuk berkas", async () => {
    const user = userEvent.setup();
    render(<StudentMaterialList classId={CLASS_ID} materials={[material()]} />);

    await user.click(screen.getAllByRole("button", { name: "Lihat" })[0]!);

    await waitFor(() =>
      expect(requestMaterialDownloadAction).toHaveBeenCalledWith(
        "22222222-2222-4222-8222-222222222222",
      ),
    );
    expect(window.open).toHaveBeenCalledWith(
      "https://signed.example/x",
      "_blank",
      "noopener,noreferrer",
    );
  });

  // Tidak ada jalur yang menyentuh Storage langsung dari peramban.
  it("tidak pernah menyematkan alamat penyimpanan di dokumen", () => {
    const { container } = render(
      <StudentMaterialList classId={CLASS_ID} materials={[material()]} />,
    );

    for (const anchor of container.querySelectorAll("a")) {
      expect(anchor.getAttribute("href")).not.toContain("supabase");
      expect(anchor.getAttribute("href")).not.toContain("storage");
    }
  });

  it("membuka tautan luar dengan atribut keamanan", () => {
    render(
      <StudentMaterialList
        classId={CLASS_ID}
        materials={[
          material({
            resourceType: "link",
            hasFile: false,
            mimeType: null,
            url: "https://contoh.id/artikel",
          }),
        ]}
      />,
    );

    const link = screen.getAllByRole("link", { name: "Buka" })[0]!;
    expect(link).toHaveAttribute("href", "https://contoh.id/artikel");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("mengarahkan materi tulisan ke halaman baca, bukan unduhan", () => {
    render(
      <StudentMaterialList
        classId={CLASS_ID}
        materials={[
          material({ resourceType: "note", hasFile: true, url: null }),
        ]}
      />,
    );

    const link = screen.getAllByRole("link", { name: "Baca" })[0]!;
    expect(link).toHaveAttribute(
      "href",
      `/app/student/classes/${CLASS_ID}/materials/22222222-2222-4222-8222-222222222222`,
    );
    expect(requestMaterialDownloadAction).not.toHaveBeenCalled();
  });

  it("menyampaikan penolakan server apa adanya", async () => {
    const user = userEvent.setup();
    requestMaterialDownloadAction.mockResolvedValue({
      ok: false,
      error: "Anda tidak memiliki izin untuk tindakan ini.",
    });

    render(<StudentMaterialList classId={CLASS_ID} materials={[material()]} />);
    await user.click(screen.getAllByRole("button", { name: "Lihat" })[0]!);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Anda tidak memiliki izin untuk tindakan ini.",
    );
    expect(window.open).not.toHaveBeenCalled();
  });
});
