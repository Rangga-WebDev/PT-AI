/** @format */

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PhaseRail } from "@/features/learning-workspace/components/phase-navigation";
import { STAGE_LABEL, STAGE_ORDER } from "@/lib/constants/stages";
import type { LearningStage, StageStatus } from "@/types/learning";

/** Fixture lokal: pengujian urutan tahap tidak boleh bergantung pada data mock. */
const STAGES: LearningStage[] = STAGE_ORDER.map((key, index) => {
  const status: StageStatus =
    index < 2 ? "mastered" : index === 2 ? "in-progress" : "locked";
  return {
    key,
    order: index + 1,
    title: STAGE_LABEL[key],
    focus: `Fokus ${STAGE_LABEL[key]}`,
    status,
    cyclePhase: "attempt",
  };
});

describe("PhaseRail — urutan tahap (LOCK-PED-002)", () => {
  it("menampilkan enam tahap sesuai urutan yang ditetapkan", () => {
    render(
      <PhaseRail
        stages={STAGES}
        currentStageKey="evaluation"
        buildHref={(key) => `/stage/${key}`}
      />,
    );

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(6);

    STAGE_ORDER.forEach((key, index) => {
      expect(items[index]).toHaveTextContent(
        `${index + 1}. ${STAGE_LABEL[key]}`,
      );
    });
  });

  it("menandai tahap berjalan dengan aria-current", () => {
    render(
      <PhaseRail
        stages={STAGES}
        currentStageKey="evaluation"
        buildHref={(key) => `/stage/${key}`}
      />,
    );

    const current = screen.getByRole("link", { current: "step" });
    expect(current).toHaveTextContent("3. Evaluasi");
  });

  it("tidak menjadikan tahap terkunci sebagai tautan", () => {
    render(
      <PhaseRail
        stages={STAGES}
        currentStageKey="evaluation"
        buildHref={(key) => `/stage/${key}`}
      />,
    );

    const lockedItem = screen
      .getAllByRole("listitem")
      .find((item) => item.textContent?.includes("4. Inferensi"));

    expect(lockedItem).toBeDefined();
    expect(
      within(lockedItem as HTMLElement).queryByRole("link"),
    ).not.toBeInTheDocument();
  });
});
