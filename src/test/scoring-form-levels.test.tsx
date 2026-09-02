/** @format */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ScoringForm } from "@/features/assessment/components/scoring-form";

const submitted: unknown[] = [];
const submitMasteryAssessmentAction = vi.fn(async (input: unknown) => {
  submitted.push(input);
  return { ok: true };
});
const requestAiReviewAction = vi.fn();

vi.mock("@/actions/assessment/scoring", () => ({
  submitMasteryAssessmentAction: (input: unknown) =>
    submitMasteryAssessmentAction(input),
  overrideMasteryAction: vi.fn(async () => ({ ok: true })),
}));

vi.mock("@/actions/assessment/branching", () => ({
  recordBranchingDecisionAction: vi.fn(async () => ({ ok: true })),
}));

vi.mock("@/actions/assessment/ai-review", () => ({
  requestAiReviewAction: (id: string) => requestAiReviewAction(id),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const ANALYSIS = "criterion-analysis";
const EVALUATION = "criterion-evaluation";

const levels = (prefix: string) =>
  [0, 1, 2, 3, 4].map((score) => ({
    score,
    label: [
      "Tidak terlihat",
      "Sangat terbatas",
      "Berkembang",
      "Baik",
      "Sangat baik",
    ][score] as string,
    descriptor: `${prefix} level ${score}`,
  }));

const CRITERIA = [
  {
    id: ANALYSIS,
    code: "CT_ANALYSIS",
    description: "Mengidentifikasi klaim, alasan, dan asumsi.",
    dimension: "analysis" as const,
    weight: 1,
    levels: levels("Analisis"),
  },
  {
    id: EVALUATION,
    code: "CT_EVALUATION",
    description: "Menilai kredibilitas sumber dan kualitas bukti.",
    dimension: "evaluation" as const,
    weight: 1,
    levels: levels("Evaluasi"),
  },
];

const PROPS = {
  attemptId: "11111111-1111-4111-8111-111111111111",
  studentId: "22222222-2222-4222-8222-222222222222",
  activityId: "33333333-3333-4333-8333-333333333333",
  criteria: CRITERIA,
  existingMastery: null,
  errorCategories: [],
};

function suggestion(score: number) {
  return {
    ok: true,
    suggestion: {
      criteria: [
        {
          criterionId: ANALYSIS,
          suggestedScore: score,
          confidence: "medium" as const,
          evidence: [],
          rationale: "Mahasiswa menguraikan klaim beserta asumsinya.",
          insufficientEvidence: false,
        },
      ],
      overallObservations: [],
      suggestedFeedback: "Perkuat penelusuran bukti pada revisi berikutnya.",
      limitations: [],
    },
    criteria: CRITERIA.map((criterion) => ({
      id: criterion.id,
      code: criterion.code,
      description: criterion.description,
      dimension: criterion.dimension,
      weight: criterion.weight,
      levels: criterion.levels,
    })),
    artifacts: [],
    model: "model-uji",
    promptVersion: 1,
  };
}

const pick = (descriptor: string) =>
  screen.getByRole("radio", { name: new RegExp(descriptor) });

beforeEach(() => {
  vi.clearAllMocks();
  requestAiReviewAction.mockResolvedValue(suggestion(3));
});

describe("penilaian berbasis level rubrik", () => {
  it("meminta dosen memilih level, bukan mengetik angka bebas", () => {
    render(<ScoringForm {...PROPS} />);

    expect(screen.getAllByRole("radio")).toHaveLength(10);
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
  });

  it("menampilkan deskriptor setiap level agar tidak perlu dihafal", () => {
    render(<ScoringForm {...PROPS} />);

    expect(screen.getByText("Analisis level 0")).toBeInTheDocument();
    expect(screen.getByText("Evaluasi level 4")).toBeInTheDocument();
  });

  it("menghitung nilai rubrik dari level yang dipilih", async () => {
    const user = userEvent.setup();
    render(<ScoringForm {...PROPS} />);

    await user.click(pick("Analisis level 4"));
    await user.click(pick("Evaluasi level 2"));

    // (4/4 + 2/4) / 2 x 100 = 75
    expect(screen.getByText("75")).toBeInTheDocument();
  });

  it("menahan penyimpanan sampai semua kriteria dinilai", async () => {
    const user = userEvent.setup();
    render(<ScoringForm {...PROPS} />);

    await user.click(pick("Analisis level 3"));
    await user.type(
      screen.getByLabelText("Catatan untuk mahasiswa"),
      "Argumen sudah runtut, bukti masih perlu diperkuat.",
    );

    expect(
      screen.getByRole("button", { name: "Simpan penilaian" }),
    ).toBeDisabled();

    await user.click(pick("Evaluasi level 2"));
    expect(
      screen.getByRole("button", { name: "Simpan penilaian" }),
    ).toBeEnabled();
  });

  it("menyimpan level mentah, bukan persentase", async () => {
    const user = userEvent.setup();
    render(<ScoringForm {...PROPS} />);

    await user.click(pick("Analisis level 4"));
    await user.click(pick("Evaluasi level 2"));
    await user.type(
      screen.getByLabelText("Catatan untuk mahasiswa"),
      "Analisis kuat, evaluasi bukti masih berkembang.",
    );
    await user.click(screen.getByRole("button", { name: "Simpan penilaian" }));

    expect(submitMasteryAssessmentAction).toHaveBeenCalledWith(
      expect.objectContaining({
        criteriaScores: [
          { criterionId: ANALYSIS, score: 4 },
          { criterionId: EVALUATION, score: 2 },
        ],
      }),
    );
  });

  it("menolak rubrik yang belum punya level", () => {
    render(
      <ScoringForm {...PROPS} criteria={[{ ...CRITERIA[0]!, levels: [] }]} />,
    );

    expect(
      screen.getByText(/Rubrik belum lengkap dan belum dapat digunakan/),
    ).toBeInTheDocument();
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
  });
});

describe("saran AI sebagai level, bukan nilai akhir", () => {
  it("menampilkan saran sebagai level rubrik berlabel", async () => {
    const user = userEvent.setup();
    render(
      <ScoringForm
        {...PROPS}
        aiReview={{ attemptId: PROPS.attemptId, hasRubric: true }}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /Bantu review dengan AI/ }),
    );

    expect(await screen.findByText("Saran AI: 3 — Baik")).toBeInTheDocument();
  });

  it("memilih level rubrik ketika saran dipakai", async () => {
    const user = userEvent.setup();
    render(
      <ScoringForm
        {...PROPS}
        aiReview={{ attemptId: PROPS.attemptId, hasRubric: true }}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /Bantu review dengan AI/ }),
    );
    await user.click(
      await screen.findByRole("button", { name: "Gunakan saran" }),
    );

    expect(pick("Analisis level 3")).toBeChecked();
    expect(pick("Analisis level 4")).not.toBeChecked();
  });

  it("mempertahankan keputusan dosen ketika ia mengubah saran", async () => {
    const user = userEvent.setup();
    render(
      <ScoringForm
        {...PROPS}
        aiReview={{ attemptId: PROPS.attemptId, hasRubric: true }}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /Bantu review dengan AI/ }),
    );
    await user.click(
      await screen.findByRole("button", { name: "Gunakan saran" }),
    );
    await user.click(pick("Analisis level 1"));
    await user.click(pick("Evaluasi level 1"));
    await user.type(
      screen.getByLabelText("Catatan untuk mahasiswa"),
      "Saya menilai lebih rendah daripada usulan AI, dengan alasan berikut.",
    );
    await user.click(screen.getByRole("button", { name: "Simpan penilaian" }));

    expect(submitMasteryAssessmentAction).toHaveBeenCalledWith(
      expect.objectContaining({
        criteriaScores: [
          { criterionId: ANALYSIS, score: 1 },
          { criterionId: EVALUATION, score: 1 },
        ],
      }),
    );
  });

  it("tidak menawarkan bantuan AI ketika rubrik belum lengkap", () => {
    render(
      <ScoringForm
        {...PROPS}
        criteria={[{ ...CRITERIA[0]!, levels: [] }]}
        aiReview={{ attemptId: PROPS.attemptId, hasRubric: false }}
      />,
    );

    expect(
      screen.getByRole("button", { name: /Bantu review dengan AI/ }),
    ).toBeDisabled();
  });
});
