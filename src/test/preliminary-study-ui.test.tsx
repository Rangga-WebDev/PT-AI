/** @format */

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  view: vi.fn(),
  overview: vi.fn(),
  respondents: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/actions/research/preliminary-study", () => ({
  getPreliminaryRespondentAction: mocks.view,
}));
vi.mock("@/lib/supabase/auth", () => ({
  requireAdminAccess: vi.fn(async () => ({ id: "admin" })),
  requireLecturerAccess: vi.fn(async () => ({ id: "lecturer" })),
}));
vi.mock("@/server/repositories/preliminary-study", () => ({
  getPreliminaryOverview: mocks.overview,
  listPreliminaryRespondents: mocks.respondents,
}));

import AdminPreliminaryStudyPage from "@/app/(protected)/app/admin/preliminary-study/page";
import LecturerPreliminaryStudyPage from "@/app/(protected)/app/lecturer/preliminary-study/page";
import { PreliminaryStudyAdmin } from "@/features/preliminary-study/components/admin-dashboard";
import { PreliminaryOverviewSections } from "@/features/preliminary-study/components/overview-sections";
import {
  CT_DIMENSIONS,
  type PreliminaryOverview,
  type PreliminaryRespondent,
  type PreliminaryRespondentDetail,
} from "@/lib/research/preliminary-study";

// Data uji sintetis: 12 responden, tidak berasal dari berkas penelitian.
const CATEGORY_OF = (index: number) =>
  index < 6 ? "Rendah" : index < 10 ? "Sedang" : "Tinggi";
const SCORES = [
  31.25, 37.5, 41.67, 43.75, 47.92, 56.25, 60.42, 64.58, 70.83, 77.08, 87.5,
  95.83,
];

const respondents: PreliminaryRespondent[] = SCORES.map((score, index) => ({
  id: `a3000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
  code: `U${String(index + 1).padStart(2, "0")}`,
  category: CATEGORY_OF(index),
  total: Math.round((score * 48) / 100),
  score,
  skills: Object.fromEntries(
    CT_DIMENSIONS.map((dimension) => [dimension, 2.5]),
  ),
}));

const overview: PreliminaryOverview = {
  dataset: {
    id: "9137dad8-a5f0-41ab-b7a3-c957011aedc7",
    title: "Tes kemampuan berpikir kritis kewarganegaraan",
    itemCount: 12,
    maxItemScore: 4,
    respondentCount: 12,
    sourceFile: "uji.csv",
    sourceSheet: "Jawaban Uji",
    importedAt: "2026-09-28T03:00:00+00:00",
  },
  summary: { respondents: 12, average: 57.21, lowest: 31.25, highest: 95.83 },
  categories: [
    { label: "Rendah", min: 0, max: 60, count: 6, percent: 50 },
    { label: "Sedang", min: 60, max: 80, count: 4, percent: 33.33 },
    { label: "Tinggi", min: 80, max: 100, count: 2, percent: 16.67 },
  ],
  skills: CT_DIMENSIONS.map((dimension, index) => ({
    dimension,
    average: [2.11, 2.25, 2.39, 2.31, 2.23, 2.44][index] ?? 0,
  })),
  items: Array.from({ length: 12 }, (_, index) => ({
    itemNumber: index + 1,
    dimension: CT_DIMENSIONS[Math.floor(index / 2)] ?? "interpretation",
    average: 2 + index / 100,
  })),
  scores: SCORES.map((score, index) => ({
    score,
    category: CATEGORY_OF(index),
  })),
};

const detail: PreliminaryRespondentDetail = {
  id: respondents[0]?.id ?? "",
  datasetId: overview.dataset.id,
  code: "U01",
  category: "Rendah",
  total: 15,
  maxTotal: 48,
  maxItemScore: 4,
  score: 31.25,
  sourceFile: "uji.csv",
  sourceSheet: "Jawaban Uji",
  sourceRow: 2,
  answers: Array.from({ length: 12 }, (_, index) => ({
    itemNumber: index + 1,
    dimension: CT_DIMENSIONS[Math.floor(index / 2)] ?? "interpretation",
    score: index === 0 ? 1 : 2,
    answer:
      index === 0
        ? "Jawaban asli <b>bukan html</b>"
        : `Jawaban uji ${index + 1}`,
  })),
};

function tableRows() {
  const table = document.querySelector('[data-slot="respondent-table"]');
  return Array.from(table?.querySelectorAll("tbody tr") ?? []).map(
    (row) => row.querySelector("td")?.textContent,
  );
}

function range() {
  return document.querySelector('[data-slot="respondent-range"]')?.textContent;
}

beforeEach(() => {
  mocks.view.mockReset();
  mocks.overview.mockReset();
  mocks.respondents.mockReset();
});

describe("ringkasan studi pendahuluan (dosen)", () => {
  it("menampilkan KPI, kategori, dan tabel data tanpa kontrol per responden", () => {
    render(<PreliminaryOverviewSections overview={overview} />);

    const summary = document.querySelector(
      '[data-slot="preliminary-summary"]',
    ) as HTMLElement;
    expect(within(summary).getByText("57,21")).toBeInTheDocument();
    expect(within(summary).getByText("31,25")).toBeInTheDocument();
    expect(within(summary).getByText("95,83")).toBeInTheDocument();

    const categories = document.querySelector(
      '[data-slot="category-distribution"]',
    ) as HTMLElement;
    expect(within(categories).getByText("60–79,99")).toBeInTheDocument();
    expect(within(categories).getByText("33,3%")).toBeInTheDocument();
    expect(screen.queryAllByRole("button")).toHaveLength(0);

    expect(screen.getByText(/Terendah pada/)).toHaveTextContent(
      "Terendah pada Interpretasi (2,11), tertinggi pada Regulasi diri (2,44).",
    );
    const items = screen.getByRole("table", {
      name: "Rata-rata skor setiap soal",
    });
    expect(within(items).getAllByRole("row")).toHaveLength(13);
    expect(
      within(items).getByRole("row", { name: "Soal 5 Evaluasi 2,04" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("table", { name: "Jumlah mahasiswa per rentang nilai" }),
    ).toBeInTheDocument();
  });
});

describe("dasbor admin", () => {
  it("membagi halaman, mencari, dan mengatur jumlah baris", async () => {
    const user = userEvent.setup();
    render(
      <PreliminaryStudyAdmin overview={overview} respondents={respondents} />,
    );

    expect(tableRows()).toHaveLength(10);
    expect(range()).toBe("1–10 dari 12 responden");

    await user.click(screen.getByRole("button", { name: "Berikutnya" }));
    expect(tableRows()).toEqual(["U11", "U12"]);

    await user.type(
      screen.getByRole("searchbox", { name: "Cari ID responden" }),
      "u1",
    );
    expect(tableRows()).toEqual(["U10", "U11", "U12"]);
    expect(range()).toBe("1–3 dari 3 responden");

    await user.clear(
      screen.getByRole("searchbox", { name: "Cari ID responden" }),
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Baris per halaman" }),
      "25",
    );
    expect(tableRows()).toHaveLength(12);
  });

  it("menyaring tabel dari grafik kategori dan menyelaraskan pilihan kategori", async () => {
    const user = userEvent.setup();
    render(
      <PreliminaryStudyAdmin overview={overview} respondents={respondents} />,
    );

    const rendah = screen.getByRole("button", { name: /^Rendah/ });
    await user.click(rendah);
    expect(rendah).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("combobox", { name: "Kategori" })).toHaveValue(
      "Rendah",
    );
    expect(range()).toBe("1–6 dari 6 responden · kategori Rendah");

    await user.click(rendah);
    expect(rendah).toHaveAttribute("aria-pressed", "false");
    expect(range()).toBe("1–10 dari 12 responden");

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Kategori" }),
      "Tinggi",
    );
    expect(screen.getByRole("button", { name: /^Tinggi/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(tableRows()).toEqual(["U11", "U12"]);
  });

  it("mengurutkan menurut nilai tertinggi lebih dahulu", async () => {
    const user = userEvent.setup();
    render(
      <PreliminaryStudyAdmin overview={overview} respondents={respondents} />,
    );

    await user.click(screen.getByRole("button", { name: /^Nilai/ }));
    expect(tableRows().slice(0, 2)).toEqual(["U12", "U11"]);
    expect(screen.getByRole("columnheader", { name: /Nilai/ })).toHaveAttribute(
      "aria-sort",
      "descending",
    );
  });

  it("membuka jawaban sebagai teks biasa, dikelompokkan per kecakapan, dan tidak memuat ulang", async () => {
    const user = userEvent.setup();
    mocks.view.mockResolvedValue({ ok: true, data: detail });
    render(
      <PreliminaryStudyAdmin overview={overview} respondents={respondents} />,
    );

    await user.click(
      screen.getAllByRole("button", {
        name: "Lihat jawaban U01",
      })[0] as HTMLElement,
    );
    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByRole("heading", { name: "U01" }),
    ).toBeInTheDocument();
    expect(
      await within(dialog).findByText("Jawaban asli <b>bukan html</b>"),
    ).toBeInTheDocument();
    expect(dialog.querySelector("b")).toBeNull();
    expect(
      within(dialog).getByRole("heading", { name: /Interpretasi/ }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText("Sumber: Jawaban Uji, baris 2"),
    ).toBeInTheDocument();
    expect(mocks.view).toHaveBeenCalledWith(respondents[0]?.id);

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await user.click(
      screen.getAllByRole("button", {
        name: "Lihat jawaban U01",
      })[0] as HTMLElement,
    );
    expect(
      await screen.findByText("Jawaban asli <b>bukan html</b>"),
    ).toBeInTheDocument();
    expect(mocks.view).toHaveBeenCalledTimes(1);
  });

  it("menampilkan galat dan dapat mencoba lagi", async () => {
    const user = userEvent.setup();
    mocks.view
      .mockResolvedValueOnce({ ok: false, error: "Anda tidak memiliki akses." })
      .mockResolvedValueOnce({ ok: true, data: detail });
    render(
      <PreliminaryStudyAdmin overview={overview} respondents={respondents} />,
    );

    await user.click(
      screen.getAllByRole("button", {
        name: "Lihat jawaban U01",
      })[0] as HTMLElement,
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Anda tidak memiliki akses.",
    );
    await user.click(screen.getByRole("button", { name: "Coba lagi" }));
    expect(
      await screen.findByText("Jawaban asli <b>bukan html</b>"),
    ).toBeInTheDocument();
    expect(mocks.view).toHaveBeenCalledTimes(2);
  });
});

describe("halaman", () => {
  it("dosen hanya menerima ringkasan, tidak pernah daftar responden", async () => {
    mocks.overview.mockResolvedValue(overview);
    render(await LecturerPreliminaryStudyPage());

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      overview.dataset.title,
    );
    expect(
      screen.getByText(/jawaban per responden hanya dibuka administrator/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("table", { name: /Responden studi pendahuluan/ }),
    ).toBeNull();
    expect(mocks.respondents).not.toHaveBeenCalled();
  });

  it("admin memuat daftar responden dataset yang sama", async () => {
    mocks.overview.mockResolvedValue(overview);
    mocks.respondents.mockResolvedValue(respondents);
    render(await AdminPreliminaryStudyPage());

    expect(mocks.respondents).toHaveBeenCalledWith(overview.dataset.id);
    expect(
      screen.getByRole("table", { name: /Responden studi pendahuluan/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Sumber: Jawaban Uji · diimpor 28 September 2026/),
    ).toBeInTheDocument();
  });

  it("menampilkan keadaan kosong sebelum ada impor", async () => {
    mocks.overview.mockResolvedValue(null);
    render(await AdminPreliminaryStudyPage());

    expect(
      screen.getByText("Belum ada data studi pendahuluan"),
    ).toBeInTheDocument();
    expect(mocks.respondents).not.toHaveBeenCalled();
  });
});
