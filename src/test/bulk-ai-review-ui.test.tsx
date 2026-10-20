/** @format */

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PendingAssessmentRow } from "@/server/repositories/attempts";

type Emit = (event: unknown) => void;

const mocks = vi.hoisted(() => ({
  stream: vi.fn<(attemptId: string, onEvent: Emit) => Promise<void>>(),
  saveBulk: vi.fn(),
}));

vi.mock("@/lib/ai/review-stream", () => ({
  streamAiReview: (attemptId: string, onEvent: Emit) =>
    mocks.stream(attemptId, onEvent),
}));

vi.mock("@/actions/assessment/scoring", () => ({
  submitBulkAssessmentsAction: (input: unknown) => mocks.saveBulk(input),
  submitMasteryAssessmentAction: vi.fn(),
  overrideMasteryAction: vi.fn(),
}));

vi.mock("@/actions/assessment/branching", () => ({
  recordBranchingDecisionAction: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

import { BulkAiReview } from "@/features/assessment/components/bulk-ai-review";

const K1 = "aaaaaaaa-0000-4000-8000-000000000001";
const K2 = "aaaaaaaa-0000-4000-8000-000000000002";
const A1 = "bbbbbbbb-0000-4000-8000-000000000001";
const A2 = "bbbbbbbb-0000-4000-8000-000000000002";
const A3 = "bbbbbbbb-0000-4000-8000-000000000003";
const A4 = "bbbbbbbb-0000-4000-8000-000000000004";

const levels = [0, 1, 2, 3, 4].map((score) => ({
  score,
  label: ["Tidak terlihat", "Terbatas", "Berkembang", "Baik", "Sangat baik"][
    score
  ]!,
  descriptor: `Level ${score}`,
}));

const META = {
  type: "meta",
  criteria: [
    {
      id: K1,
      code: "K1",
      description: "Analisis",
      dimension: "analysis",
      weight: 1,
      levels,
    },
    {
      id: K2,
      code: "K2",
      description: "Evaluasi",
      dimension: "evaluation",
      weight: 1,
      levels,
    },
  ],
  artifacts: [],
  model: "model-uji",
  promptVersion: 1,
};

const entry = (criterionId: string, suggestedScore: number) => ({
  criterionId,
  suggestedScore,
  confidence: "medium",
  evidence: [],
  rationale: "Alasan usulan yang cukup panjang.",
  insufficientEvidence: false,
});

function done(attemptId: string) {
  return {
    type: "done",
    suggestion: {
      criteria: [entry(K1, 4), entry(K2, 2)],
      overallObservations: [],
      suggestedFeedback: `Catatan untuk ${attemptId}.`,
      limitations: [],
    },
  };
}

function item(
  attemptId: string,
  studentName: string,
  overrides: Partial<PendingAssessmentRow> = {},
): PendingAssessmentRow {
  return {
    attemptId,
    studentName,
    studentIdentifier: `NIM-${studentName}`,
    className: "PKN A",
    unitTitle: "Unit 1",
    stageTitle: "Interpretasi",
    activityTitle: "Aktivitas",
    submittedAt: "2026-10-20T01:00:00Z",
    hasRubric: true,
    masteryThreshold: null,
    ...overrides,
  };
}

const ITEMS = [
  item(A1, "Ani"),
  item(A2, "Budi", { masteryThreshold: 90 }),
  item(A3, "Cici", { hasRubric: false }),
];

function rowOf(name: string) {
  return screen.getByText(name).closest("li") as HTMLElement;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.stream.mockImplementation(async (attemptId, onEvent) => {
    onEvent(META);
    onEvent(done(attemptId));
  });
});

describe("BulkAiReview", () => {
  it("meminta usulan AI untuk semua respons berubrik sekaligus", async () => {
    const user = userEvent.setup();
    render(<BulkAiReview items={ITEMS} />);

    await user.click(
      screen.getByRole("button", { name: "Periksa semua dengan AI (2)" }),
    );

    await waitFor(() => expect(mocks.stream).toHaveBeenCalledTimes(2));
    expect(mocks.stream.mock.calls.map(([id]) => id)).toEqual([A1, A2]);

    expect(
      within(rowOf("Ani")).getByText(/Nilai rubrik usulan/),
    ).toHaveTextContent("75");
    expect(within(rowOf("Ani")).getByLabelText("Hasil ketuntasan")).toHaveValue(
      "met",
    );
    // Ambang aktivitas sendiri (90) mengalahkan ambang bawaan.
    expect(
      within(rowOf("Budi")).getByLabelText("Hasil ketuntasan"),
    ).toHaveValue("partially_met");
    expect(
      within(rowOf("Cici")).getByText(/belum memiliki rubrik/),
    ).toBeInTheDocument();
  });

  it("menyimpan semua usulan terpilih sebagai keputusan dosen", async () => {
    mocks.saveBulk.mockResolvedValue({ saved: [A1, A2], failed: [] });
    const user = userEvent.setup();
    render(<BulkAiReview items={ITEMS} />);

    await user.click(
      screen.getByRole("button", { name: "Periksa semua dengan AI (2)" }),
    );
    await user.click(
      await screen.findByRole("button", { name: "Simpan 2 penilaian" }),
    );

    expect(mocks.saveBulk).toHaveBeenCalledWith([
      {
        attemptId: A1,
        outcome: "met",
        comment: `Catatan untuk ${A1}.`,
        criteriaScores: [
          { criterionId: K1, score: 4 },
          { criterionId: K2, score: 2 },
        ],
      },
      expect.objectContaining({ attemptId: A2, outcome: "partially_met" }),
    ]);
    expect(
      await screen.findByText("2 penilaian tersimpan."),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Penilaian tersimpan.")).toHaveLength(2);
  });

  it("hanya menyimpan baris yang tetap dicentang dan hasil yang diubah dosen", async () => {
    mocks.saveBulk.mockResolvedValue({ saved: [A2], failed: [] });
    const user = userEvent.setup();
    render(<BulkAiReview items={ITEMS} />);

    await user.click(
      screen.getByRole("button", { name: "Periksa semua dengan AI (2)" }),
    );
    await user.click(
      await within(rowOf("Ani")).findByLabelText("Sertakan saat menyimpan"),
    );
    await user.selectOptions(
      within(rowOf("Budi")).getByLabelText("Hasil ketuntasan"),
      "not_met",
    );
    await user.click(
      screen.getByRole("button", { name: "Simpan 1 penilaian" }),
    );

    expect(mocks.saveBulk).toHaveBeenCalledWith([
      expect.objectContaining({ attemptId: A2, outcome: "not_met" }),
    ]);
  });

  it("berhenti ketika kuota AI habis dan menyisakan respons untuk nanti", async () => {
    mocks.stream.mockImplementation(async (attemptId, onEvent) => {
      if (attemptId === A1) {
        onEvent({
          type: "error",
          error: "Terlalu banyak permintaan bantuan AI.",
          status: 429,
        });
        return;
      }
      onEvent(META);
      onEvent(done(attemptId));
    });
    const user = userEvent.setup();
    render(
      <BulkAiReview
        items={[item(A1, "Ani"), item(A2, "Budi"), item(A4, "Dodi")]}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Periksa semua dengan AI (3)" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Terlalu banyak permintaan bantuan AI.",
    );
    expect(mocks.stream.mock.calls.map(([id]) => id)).not.toContain(A4);
    expect(
      screen.getByRole("button", { name: "Periksa semua dengan AI (2)" }),
    ).toBeEnabled();
  });

  it("menawarkan coba lagi untuk kegagalan layanan", async () => {
    mocks.stream.mockImplementation(async (_attemptId, onEvent) => {
      onEvent({
        type: "error",
        error: "Layanan AI sedang tidak dapat dihubungi.",
      });
    });
    const user = userEvent.setup();
    render(<BulkAiReview items={[item(A1, "Ani")]} />);

    await user.click(
      screen.getByRole("button", { name: "Periksa semua dengan AI (1)" }),
    );

    expect(
      await within(rowOf("Ani")).findByText(
        "Layanan AI sedang tidak dapat dihubungi.",
      ),
    ).toBeInTheDocument();
    expect(
      within(rowOf("Ani")).getByRole("button", { name: "Coba lagi" }),
    ).toBeEnabled();
  });
});
