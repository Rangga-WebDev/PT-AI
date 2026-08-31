/** @format */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { MaterialView } from "@/lib/materials/types";

const refresh = vi.fn();
const createLinkMaterialAction = vi.fn();
const createNoteMaterialAction = vi.fn();
const updateMaterialAction = vi.fn();
const setMaterialPublicationAction = vi.fn();
const deleteMaterialAction = vi.fn();
const requestMaterialDownloadAction = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

vi.mock("@/actions/courses/materials", () => ({
  createLinkMaterialAction: (state: unknown, data: FormData) =>
    createLinkMaterialAction(state, data),
  createNoteMaterialAction: (state: unknown, data: FormData) =>
    createNoteMaterialAction(state, data),
  updateMaterialAction: (state: unknown, data: FormData) =>
    updateMaterialAction(state, data),
  setMaterialPublicationAction: (state: unknown, data: FormData) =>
    setMaterialPublicationAction(state, data),
  deleteMaterialAction: (state: unknown, data: FormData) =>
    deleteMaterialAction(state, data),
  requestMaterialDownloadAction: (id: string) =>
    requestMaterialDownloadAction(id),
}));

const { MaterialsWorkspace } =
  await import("@/features/materials/components/materials-workspace");

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
    extractionStatus: "pending",
    extractedAt: null,
    createdAt: "2026-08-31T02:00:00.000Z",
    updatedAt: "2026-08-31T02:00:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  createLinkMaterialAction.mockResolvedValue({
    ok: true,
    message: "tersimpan",
  });
  createNoteMaterialAction.mockResolvedValue({
    ok: true,
    message: "tersimpan",
  });
  updateMaterialAction.mockResolvedValue({ ok: true, message: "tersimpan" });
  setMaterialPublicationAction.mockResolvedValue({ ok: true, message: "ok" });
  deleteMaterialAction.mockResolvedValue({ ok: true, message: "ok" });
  requestMaterialDownloadAction.mockResolvedValue({
    ok: true,
    download: {
      url: "https://signed.example/x",
      filename: "rps.pdf",
      expiresInSeconds: 300,
    },
  });
  vi.stubGlobal("fetch", vi.fn());
  vi.stubGlobal("open", vi.fn());
});

describe("daftar materi dosen", () => {
  it("menampilkan bahan beserta status dan visibilitasnya", () => {
    render(<MaterialsWorkspace classId={CLASS_ID} materials={[material()]} />);

    expect(
      screen.getAllByText("RPS Pendidikan Kewarganegaraan").length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("Terbit").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Mahasiswa").length).toBeGreaterThan(0);
    expect(screen.getAllByText("PDF").length).toBeGreaterThan(0);
  });

  it("membedakan draf dari yang sudah terbit", () => {
    render(
      <MaterialsWorkspace
        classId={CLASS_ID}
        materials={[material({ status: "draft" })]}
      />,
    );

    expect(screen.getAllByText("Draf").length).toBeGreaterThan(0);
    expect(screen.queryByText("Terbit")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Terbitkan" }).length).toBe(2);
  });

  // Status tidak boleh hanya dibedakan warna.
  it("menyebut status pembacaan berkas dengan kata, bukan warna saja", () => {
    render(<MaterialsWorkspace classId={CLASS_ID} materials={[material()]} />);

    expect(screen.getAllByText("Menunggu pembacaan").length).toBeGreaterThan(0);
  });

  it("tidak menyebut status pembacaan untuk tautan", () => {
    render(
      <MaterialsWorkspace
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

    expect(screen.queryByText("Menunggu pembacaan")).not.toBeInTheDocument();
    expect(screen.getAllByText("Tautan").length).toBeGreaterThan(0);
  });

  it("menampilkan keadaan kosong yang menawarkan langkah pertama", () => {
    render(<MaterialsWorkspace classId={CLASS_ID} materials={[]} />);

    expect(screen.getByText("Belum ada materi")).toBeInTheDocument();
    // Satu ajakan saja: bilah aksi di atas sudah memuat tombol yang sama.
    expect(
      screen.getAllByRole("button", { name: "+ Tambah materi" }),
    ).toHaveLength(2);
    expect(
      screen.getAllByRole("button", { name: "Unggah RPS / CPMK" }),
    ).toHaveLength(1);
  });

  it("menyingkirkan ajakan memulai begitu panel terbuka", async () => {
    const user = userEvent.setup();
    render(<MaterialsWorkspace classId={CLASS_ID} materials={[]} />);

    await user.click(
      screen.getAllByRole("button", { name: "+ Tambah materi" })[0]!,
    );

    expect(screen.queryByText("Belum ada materi")).not.toBeInTheDocument();
  });
});

describe("menambah materi", () => {
  it("menawarkan tiga cara sebelum menampilkan formulir", async () => {
    const user = userEvent.setup();
    render(<MaterialsWorkspace classId={CLASS_ID} materials={[]} />);

    await user.click(
      screen.getAllByRole("button", { name: "+ Tambah materi" })[0]!,
    );

    expect(
      screen.getByRole("button", { name: /Unggah berkas/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Tambah tautan/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Tulis materi/ }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Judul")).not.toBeInTheDocument();
  });

  it("mengirim berkas ke Route Handler unggahan, bukan Server Action", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        resourceId: "33333333-3333-4333-8333-333333333333",
        extractionStatus: "pending",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<MaterialsWorkspace classId={CLASS_ID} materials={[]} />);
    await user.click(
      screen.getAllByRole("button", { name: "+ Tambah materi" })[0]!,
    );
    await user.click(screen.getByRole("button", { name: /Unggah berkas/ }));

    await user.type(screen.getByLabelText("Judul"), "RPS 2026");
    await user.upload(
      screen.getByLabelText("Berkas"),
      new File(["%PDF-1.7"], "rps.pdf", { type: "application/pdf" }),
    );
    await user.click(screen.getByRole("button", { name: "Unggah berkas" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/materials/upload");
    expect((init as RequestInit).method).toBe("POST");
    const body = (init as RequestInit).body as FormData;
    expect(body.get("classId")).toBe(CLASS_ID);
    expect(body.get("title")).toBe("RPS 2026");
  });

  it("menampilkan pesan galat dari Route Handler tanpa menutup formulir", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          ok: false,
          error: "Anda bukan pengampu kelas ini.",
        }),
      }),
    );

    render(<MaterialsWorkspace classId={CLASS_ID} materials={[]} />);
    await user.click(
      screen.getAllByRole("button", { name: "+ Tambah materi" })[0]!,
    );
    await user.click(screen.getByRole("button", { name: /Unggah berkas/ }));
    await user.type(screen.getByLabelText("Judul"), "RPS 2026");
    await user.upload(
      screen.getByLabelText("Berkas"),
      new File(["%PDF-1.7"], "rps.pdf", { type: "application/pdf" }),
    );
    await user.click(screen.getByRole("button", { name: "Unggah berkas" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Anda bukan pengampu kelas ini.",
    );
  });

  it("menyimpan tautan lewat Server Action yang sudah ada", async () => {
    const user = userEvent.setup();
    render(<MaterialsWorkspace classId={CLASS_ID} materials={[]} />);

    await user.click(
      screen.getAllByRole("button", { name: "+ Tambah materi" })[0]!,
    );
    await user.click(screen.getByRole("button", { name: /Tambah tautan/ }));

    await user.type(screen.getByLabelText("Judul"), "Artikel demokrasi");
    await user.type(screen.getByLabelText("Tautan"), "https://contoh.id/a");
    await user.click(screen.getByRole("button", { name: "Simpan tautan" }));

    await waitFor(() => expect(createLinkMaterialAction).toHaveBeenCalled());
    expect(fetch).not.toHaveBeenCalled();
  });

  it("menyimpan materi tulisan lewat Server Action yang sudah ada", async () => {
    const user = userEvent.setup();
    render(<MaterialsWorkspace classId={CLASS_ID} materials={[]} />);

    await user.click(
      screen.getAllByRole("button", { name: "+ Tambah materi" })[0]!,
    );
    await user.click(screen.getByRole("button", { name: /Tulis materi/ }));

    await user.type(screen.getByLabelText("Judul"), "Pengantar");
    await user.type(
      screen.getByLabelText("Isi materi"),
      "Bab satu membahas kedudukan warga negara.",
    );
    await user.click(screen.getByRole("button", { name: "Simpan materi" }));

    await waitFor(() => expect(createNoteMaterialAction).toHaveBeenCalled());
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("aksi pada bahan", () => {
  it("menerbitkan lewat Server Action", async () => {
    const user = userEvent.setup();
    render(
      <MaterialsWorkspace
        classId={CLASS_ID}
        materials={[material({ status: "draft" })]}
      />,
    );

    await user.click(screen.getAllByRole("button", { name: "Terbitkan" })[0]!);

    await waitFor(() =>
      expect(setMaterialPublicationAction).toHaveBeenCalled(),
    );
    const data = setMaterialPublicationAction.mock.calls[0]![1] as FormData;
    expect(data.get("status")).toBe("published");
  });

  it("menarik bahan yang sudah terbit", async () => {
    const user = userEvent.setup();
    render(<MaterialsWorkspace classId={CLASS_ID} materials={[material()]} />);

    await user.click(screen.getAllByRole("button", { name: "Tarik" })[0]!);

    await waitFor(() =>
      expect(setMaterialPublicationAction).toHaveBeenCalled(),
    );
    const data = setMaterialPublicationAction.mock.calls[0]![1] as FormData;
    expect(data.get("status")).toBe("draft");
  });

  it("mencabut bahan lewat Server Action", async () => {
    const user = userEvent.setup();
    render(<MaterialsWorkspace classId={CLASS_ID} materials={[material()]} />);

    await user.click(screen.getAllByRole("button", { name: "Cabut" })[0]!);

    await waitFor(() => expect(deleteMaterialAction).toHaveBeenCalled());
  });

  // Tautan bertanda tangan diminta saat ditekan, bukan disematkan di dokumen.
  it("meminta tautan bertanda tangan ketika berkas dibuka", async () => {
    const user = userEvent.setup();
    render(<MaterialsWorkspace classId={CLASS_ID} materials={[material()]} />);

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

  it("tidak meminta tautan bertanda tangan untuk bahan berupa tautan", () => {
    render(
      <MaterialsWorkspace
        classId={CLASS_ID}
        materials={[
          material({
            resourceType: "link",
            hasFile: false,
            url: "https://contoh.id/artikel",
          }),
        ]}
      />,
    );

    const link = screen.getAllByRole("link", { name: "Lihat" })[0]!;
    expect(link).toHaveAttribute("href", "https://contoh.id/artikel");
    expect(requestMaterialDownloadAction).not.toHaveBeenCalled();
  });

  it("membuka formulir ubah dengan nilai yang sudah ada", async () => {
    const user = userEvent.setup();
    render(<MaterialsWorkspace classId={CLASS_ID} materials={[material()]} />);

    await user.click(screen.getAllByRole("button", { name: "Ubah" })[0]!);

    expect(screen.getByLabelText("Judul")).toHaveValue(
      "RPS Pendidikan Kewarganegaraan",
    );
  });
});

describe("dokumen awal dan CTA AI", () => {
  it("menyediakan pilihan jenis dokumen awal pembelajaran", async () => {
    const user = userEvent.setup();
    render(<MaterialsWorkspace classId={CLASS_ID} materials={[]} />);

    await user.click(
      screen.getAllByRole("button", { name: "Unggah RPS / CPMK" })[0]!,
    );

    const kinds = screen.getByLabelText("Jenis dokumen");
    expect(kinds).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "RPS" })).toBeInTheDocument();
  });

  it("menyebut status pembacaan setelah dokumen awal terunggah", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          resourceId: "44444444-4444-4444-8444-444444444444",
          extractionStatus: "pending",
        }),
      }),
    );

    render(<MaterialsWorkspace classId={CLASS_ID} materials={[]} />);
    await user.click(
      screen.getAllByRole("button", { name: "Unggah RPS / CPMK" })[0]!,
    );
    await user.type(screen.getByLabelText("Judul"), "RPS 2026");
    await user.upload(
      screen.getByLabelText("Berkas"),
      new File(["%PDF-1.7"], "rps.pdf", { type: "application/pdf" }),
    );
    await user.click(screen.getByRole("button", { name: "Unggah dokumen" }));

    expect(await screen.findByText("Menunggu pembacaan")).toBeInTheDocument();
    expect(
      screen.getByText(/belum dapat dijadikan rujukan/i),
    ).toBeInTheDocument();
  });

  // CTA AI pada fase ini hanya menjelaskan; tidak ada panggilan penyedia.
  it("CTA AI tidak memanggil jaringan sama sekali", async () => {
    const user = userEvent.setup();
    render(<MaterialsWorkspace classId={CLASS_ID} materials={[]} />);

    await user.click(screen.getByRole("button", { name: /Buat dengan AI/ }));

    expect(screen.getByText("Segera tersedia.")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
    expect(createNoteMaterialAction).not.toHaveBeenCalled();
  });
});
