/** @format */

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PhaseRail } from "@/features/learning-workspace/components/phase-navigation";
import { LEARNING_STAGE_BLUEPRINT, MOCK_ACTIVE_UNIT } from "@/mocks/units";

describe("PhaseRail — urutan tahap (LOCK-PED-002)", () => {
  it("menampilkan enam tahap sesuai urutan yang ditetapkan", () => {
    render(
      <PhaseRail
        stages={MOCK_ACTIVE_UNIT.stages}
        currentStageKey={MOCK_ACTIVE_UNIT.currentStageKey}
        buildHref={(key) => `/stage/${key}`}
      />,
    );

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(6);

    LEARNING_STAGE_BLUEPRINT.forEach((stage, index) => {
      expect(items[index]).toHaveTextContent(`${stage.order}. ${stage.title}`);
    });
  });

  it("menandai tahap berjalan dengan aria-current", () => {
    render(
      <PhaseRail
        stages={MOCK_ACTIVE_UNIT.stages}
        currentStageKey="evaluasi"
        buildHref={(key) => `/stage/${key}`}
      />,
    );

    const current = screen.getByRole("link", { current: "step" });
    expect(current).toHaveTextContent("3. Evaluasi");
  });

  it("tidak menjadikan tahap terkunci sebagai tautan", () => {
    render(
      <PhaseRail
        stages={MOCK_ACTIVE_UNIT.stages}
        currentStageKey="evaluasi"
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
