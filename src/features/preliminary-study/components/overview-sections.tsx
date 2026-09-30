/** @format */

import type { PreliminaryOverview } from "@/lib/research/preliminary-study";

import { ItemAnalysis, ScoreDistribution, SkillProfile } from "./study-charts";
import { CategoryDistribution, StudySummary } from "./study-summary";

interface PreliminaryOverviewSectionsProps {
  overview: PreliminaryOverview;
  selectedCategory?: string | null | undefined;
  onSelectCategory?: ((label: string) => void) | undefined;
}

/** Ringkasan agregat yang sama untuk admin dan dosen. */
export function PreliminaryOverviewSections({
  overview,
  selectedCategory,
  onSelectCategory,
}: PreliminaryOverviewSectionsProps) {
  const { dataset } = overview;

  return (
    <div className="flex flex-col gap-12">
      <StudySummary summary={overview.summary} />
      <CategoryDistribution
        categories={overview.categories}
        selected={selectedCategory}
        onSelect={onSelectCategory}
      />
      <div className="grid grid-cols-1 gap-12 xl:grid-cols-2 xl:gap-16">
        <SkillProfile
          skills={overview.skills}
          items={overview.items}
          maxItemScore={dataset.maxItemScore}
        />
        <ScoreDistribution
          scores={overview.scores}
          categories={overview.categories}
        />
      </div>
      <ItemAnalysis
        items={overview.items}
        maxItemScore={dataset.maxItemScore}
      />
    </div>
  );
}
