/** @format */

// @vitest-environment node

import { describe, expect, it } from "vitest";

import {
  aggregatePortfolio,
  buildTimeline,
  formatObservedDuration,
} from "@/lib/portfolio/aggregate";
import type { PortfolioActivity } from "@/lib/portfolio/types";

type Evidence = Omit<
  PortfolioActivity,
  "activityId" | "activityTitle" | "stageTitle" | "unitTitle"
>;

function evidence(overrides: Partial<Evidence> = {}): Evidence {
  return {
    initialResponse: {
      id: "a1",
      content: "Respons awal.",
      submittedAt: "2026-09-01T09:14:00.000Z",
    },
    revisions: [],
    sourceVerifications: [],
    claimVerifications: [],
    aiAssistance: [],
    reflection: null,
    lecturerFeedback: [],
    mastery: null,
    observedSeconds: null,
    ...overrides,
  };
}

const MEETINGS = [
  { id: "m4", sequence: 4, title: "Demokrasi Digital" },
  { id: "m1", sequence: 1, title: "Orientasi" },
];

const ACTIVITIES = [
  {
    activityId: "act1",
    activityTitle: "Analisis klaim",
    stageTitle: "Analisis",
    unitTitle: "Unit 1",
    moduleId: "m4",
  },
];

describe("pengelompokan per pertemuan", () => {
  it("mengurutkan pertemuan menurut nomornya", () => {
    const result = aggregatePortfolio({
      meetings: MEETINGS,
      activities: [],
      evidence: new Map(),
    });

    expect(result.map((item) => item.meeting.sequence)).toEqual([1, 4]);
  });

  // Pertemuan tanpa artefak tetap muncul supaya daftarnya utuh.
  it("mempertahankan pertemuan yang belum punya bukti", () => {
    const result = aggregatePortfolio({
      meetings: MEETINGS,
      activities: ACTIVITIES,
      evidence: new Map([["act1", evidence()]]),
    });

    const orientasi = result.find((item) => item.meeting.id === "m1");
    expect(orientasi?.activities).toEqual([]);
    expect(orientasi?.hasEvidence).toBe(false);
  });

  it("menempatkan aktivitas pada pertemuan yang benar", () => {
    const result = aggregatePortfolio({
      meetings: MEETINGS,
      activities: ACTIVITIES,
      evidence: new Map([["act1", evidence()]]),
    });

    const meeting = result.find((item) => item.meeting.id === "m4");
    expect(meeting?.activities).toHaveLength(1);
    expect(meeting?.hasEvidence).toBe(true);
  });

  // Aktivitas yang tidak punya artefak sama sekali tidak boleh ikut terbawa.
  it("mengabaikan aktivitas tanpa bukti", () => {
    const result = aggregatePortfolio({
      meetings: MEETINGS,
      activities: ACTIVITIES,
      evidence: new Map(),
    });

    expect(result.every((item) => item.activities.length === 0)).toBe(true);
  });

  it("menghitung bukti apa adanya", () => {
    const result = aggregatePortfolio({
      meetings: MEETINGS,
      activities: ACTIVITIES,
      evidence: new Map([
        [
          "act1",
          evidence({
            revisions: [
              {
                id: "r1",
                revisionNumber: 1,
                content: "Revisi satu.",
                submittedAt: "2026-09-01T09:34:00.000Z",
                reasons: [],
              },
              {
                id: "r2",
                revisionNumber: 2,
                content: "Revisi dua.",
                submittedAt: "2026-09-01T09:38:00.000Z",
                reasons: [],
              },
            ],
            aiAssistance: [
              {
                id: "f1",
                kind: "guiding_question",
                title: "Bukti apa yang menopang klaim?",
                body: "Tunjukkan bagiannya.",
                dimension: "analysis",
                studentAction: "accepted",
                createdAt: "2026-09-01T09:19:00.000Z",
              },
            ],
            sourceVerifications: [
              {
                id: "s1",
                sourceTitle: "Sumber A",
                verdict: "credible",
                note: "Penulisnya jelas.",
                createdAt: "2026-09-01T09:25:00.000Z",
              },
            ],
            lecturerFeedback: [
              {
                id: "lf1",
                content: "Argumennya menguat.",
                authorName: "Dosen Uji",
                createdAt: "2026-09-01T15:10:00.000Z",
                onRevisionNumber: 2,
              },
            ],
          }),
        ],
      ]),
    });

    const meeting = result.find((item) => item.meeting.id === "m4");
    expect(meeting?.counts).toEqual({
      activities: 1,
      revisions: 2,
      reflections: 0,
      verifications: 1,
      aiAssistance: 1,
      lecturerFeedback: 1,
    });
  });
});

describe("durasi teramati", () => {
  // Tidak ada sesi berarti tidak terukur, bukan nol menit.
  it("membedakan tidak terukur dari nol", () => {
    const withoutSession = aggregatePortfolio({
      meetings: MEETINGS,
      activities: ACTIVITIES,
      evidence: new Map([["act1", evidence({ observedSeconds: null })]]),
    });

    expect(
      withoutSession.find((item) => item.meeting.id === "m4")?.observedSeconds,
    ).toBeNull();

    const withSession = aggregatePortfolio({
      meetings: MEETINGS,
      activities: ACTIVITIES,
      evidence: new Map([["act1", evidence({ observedSeconds: 0 })]]),
    });

    expect(
      withSession.find((item) => item.meeting.id === "m4")?.observedSeconds,
    ).toBe(0);
  });

  it("menyatakan durasi dalam satuan yang terbaca", () => {
    expect(formatObservedDuration(null)).toBeNull();
    expect(formatObservedDuration(0)).toBeNull();
    expect(formatObservedDuration(1440)).toBe("24 menit");
    expect(formatObservedDuration(3600)).toBe("1 jam");
    expect(formatObservedDuration(5400)).toBe("1 jam 30 menit");
  });
});

describe("linimasa", () => {
  const activity: PortfolioActivity = {
    activityId: "act1",
    activityTitle: "Analisis klaim",
    stageTitle: "Analisis",
    unitTitle: "Unit 1",
    ...evidence({
      aiAssistance: [
        {
          id: "f1",
          kind: "hint",
          title: "Petunjuk",
          body: "Cek sumbernya.",
          dimension: null,
          studentAction: "pending",
          createdAt: "2026-09-01T09:19:00.000Z",
        },
      ],
      sourceVerifications: [
        {
          id: "s1",
          sourceTitle: "Sumber A",
          verdict: "credible",
          note: "Catatan.",
          createdAt: "2026-09-01T09:25:00.000Z",
        },
      ],
      revisions: [
        {
          id: "r1",
          revisionNumber: 1,
          content: "Revisi.",
          submittedAt: "2026-09-01T09:34:00.000Z",
          reasons: [],
        },
      ],
      reflection: {
        id: "rf1",
        submittedAt: "2026-09-01T09:40:00.000Z",
        entries: [{ label: "Ringkasan akhir", value: "Sudah lebih kuat." }],
      },
      lecturerFeedback: [
        {
          id: "lf1",
          content: "Baik.",
          authorName: "Dosen Uji",
          createdAt: "2026-09-01T15:10:00.000Z",
          onRevisionNumber: null,
        },
      ],
    }),
  };

  it("mengurutkan seluruh peristiwa menurut waktunya", () => {
    const timeline = buildTimeline(activity);

    expect(timeline.map((entry) => entry.kind)).toEqual([
      "initial_response",
      "ai_assistance",
      "source_verification",
      "revision",
      "reflection",
      "lecturer_feedback",
    ]);
  });

  // Linimasa hanya menyusun ulang artefak yang sama; tidak menambah apa pun.
  it("tidak memuat peristiwa yang tidak punya artefak", () => {
    const bare: PortfolioActivity = {
      activityId: "act2",
      activityTitle: "Kosong",
      stageTitle: "Interpretasi",
      unitTitle: "Unit 1",
      ...evidence({ initialResponse: null }),
    };

    expect(buildTimeline(bare)).toEqual([]);
  });

  it("membedakan bantuan AI dari umpan balik dosen", () => {
    const timeline = buildTimeline(activity);
    const ai = timeline.find((entry) => entry.kind === "ai_assistance");
    const lecturer = timeline.find(
      (entry) => entry.kind === "lecturer_feedback",
    );

    expect(ai?.label).toContain("Bantuan AI");
    expect(lecturer?.label).toBe("Umpan balik dosen");
    expect(ai?.label).not.toContain("Jawaban");
  });
});

describe("respons awal dan revisi", () => {
  it("mempertahankan respons awal di samping revisi terakhir", () => {
    const result = aggregatePortfolio({
      meetings: MEETINGS,
      activities: ACTIVITIES,
      evidence: new Map([
        [
          "act1",
          evidence({
            revisions: [
              {
                id: "r1",
                revisionNumber: 1,
                content: "Revisi satu.",
                submittedAt: "2026-09-01T09:34:00.000Z",
                reasons: [],
              },
              {
                id: "r2",
                revisionNumber: 2,
                content: "Revisi dua.",
                submittedAt: "2026-09-01T09:38:00.000Z",
                reasons: [],
              },
            ],
          }),
        ],
      ]),
    });

    const activity = result.find((item) => item.meeting.id === "m4")
      ?.activities[0];

    expect(activity?.initialResponse?.content).toBe("Respons awal.");
    expect(activity?.revisions.at(-1)?.content).toBe("Revisi dua.");
    expect(activity?.revisions.map((item) => item.revisionNumber)).toEqual([
      1, 2,
    ]);
  });
});
