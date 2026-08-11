/** @format */

import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { CtDimension } from "@/lib/constants/stages";

import { unwrap } from "./shared";

export interface RubricLevelView {
  id: string;
  levelOrder: number;
  label: string;
  descriptor: string;
  score: number;
}

export interface RubricCriterionView {
  id: string;
  code: string;
  description: string;
  dimension: CtDimension;
  weight: number;
  sequence: number;
  levels: RubricLevelView[];
}

export interface RubricView {
  id: string;
  title: string;
  description: string | null;
  status: "draft" | "published" | "archived";
  criteria: RubricCriterionView[];
}

export async function listRubrics(): Promise<RubricView[]> {
  const supabase = await createClient();

  const rows = unwrap(
    await supabase
      .from("rubrics")
      .select(
        `id, title, description, status,
         rubric_criteria(
           id, code, description, dimension, weight, sequence,
           rubric_levels(id, level_order, label, descriptor, score)
         )`,
      )
      .is("deleted_at", null)
      .order("title"),
    "listRubrics",
  );

  return rows.map((rubric) => ({
    id: rubric.id,
    title: rubric.title,
    description: rubric.description,
    status: rubric.status,
    criteria: rubric.rubric_criteria
      .slice()
      .sort((a, b) => a.sequence - b.sequence)
      .map((criterion) => ({
        id: criterion.id,
        code: criterion.code,
        description: criterion.description,
        dimension: criterion.dimension,
        weight: criterion.weight,
        sequence: criterion.sequence,
        levels: criterion.rubric_levels
          .slice()
          .sort((a, b) => a.level_order - b.level_order)
          .map((level) => ({
            id: level.id,
            levelOrder: level.level_order,
            label: level.label,
            descriptor: level.descriptor,
            score: level.score,
          })),
      })),
  }));
}
