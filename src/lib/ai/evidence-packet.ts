/** @format */

import type { CriterionSuggestion, ReviewSuggestion } from "./review-schema";

/**
 * Paket bukti yang dikirim ke asisten. Setiap potongan punya id yang berasal
 * dari basis data, sehingga kutipan yang dikembalikan model dapat ditagih
 * kebenarannya. Model tidak pernah boleh menentukan id sendiri.
 */

export type ArtifactKind =
  | "initial_response"
  | "revision"
  | "revision_reason"
  | "source_verification"
  | "claim_verification"
  | "reflection"
  | "lecturer_feedback"
  | "ai_scaffolding";

export interface EvidenceArtifact {
  id: string;
  kind: ArtifactKind;
  label: string;
  content: string;
  /**
   * Karya mahasiswa atau bukan. Bantuan AI ikut dikirim sebagai konteks
   * proses, tetapi tidak boleh dihitung sebagai capaian mahasiswa.
   */
  studentAuthored: boolean;
}

export interface EvidenceCriterion {
  id: string;
  code: string;
  description: string;
  dimension: string;
  weight: number;
  /** Skor yang sah menurut rubrik. Kosong berarti rubrik belum punya level. */
  levels: { label: string; descriptor: string; score: number }[];
}

export interface EvidencePacket {
  attemptId: string;
  activityTitle: string;
  activityPrompt: string;
  stageTitle: string;
  unitTitle: string;
  rubricTitle: string;
  criteria: EvidenceCriterion[];
  artifacts: EvidenceArtifact[];
}

export type CitationRejection =
  | { kind: "unknown_criterion"; id: string }
  | { kind: "duplicate_criterion"; id: string }
  | { kind: "unknown_artifact"; id: string }
  | { kind: "score_outside_rubric"; id: string; score: number }
  | { kind: "score_without_levels"; id: string };

export type SuggestionValidation =
  | { ok: true; suggestion: ReviewSuggestion }
  | { ok: false; rejections: CitationRejection[] };

/**
 * Kutipan yang tidak dapat ditelusuri ke paket bukti membatalkan seluruh
 * hasil, bukan hanya butirnya. Menyaring diam-diam akan menyisakan penilaian
 * yang tampak beralasan padahal alasannya sudah dibuang.
 */
export function validateSuggestion(
  packet: EvidencePacket,
  suggestion: ReviewSuggestion,
): SuggestionValidation {
  const criteriaById = new Map(packet.criteria.map((item) => [item.id, item]));
  const artifactIds = new Set(packet.artifacts.map((item) => item.id));
  const seen = new Set<string>();
  const rejections: CitationRejection[] = [];

  for (const entry of suggestion.criteria) {
    const criterion = criteriaById.get(entry.criterionId);

    if (!criterion) {
      rejections.push({ kind: "unknown_criterion", id: entry.criterionId });
      continue;
    }

    if (seen.has(entry.criterionId)) {
      rejections.push({ kind: "duplicate_criterion", id: entry.criterionId });
    }
    seen.add(entry.criterionId);

    for (const reference of entry.evidence) {
      if (!artifactIds.has(reference.artifactId)) {
        rejections.push({
          kind: "unknown_artifact",
          id: reference.artifactId,
        });
      }
    }

    if (entry.suggestedScore !== null) {
      if (criterion.levels.length === 0) {
        rejections.push({ kind: "score_without_levels", id: criterion.id });
      } else if (
        !criterion.levels.some((level) => level.score === entry.suggestedScore)
      ) {
        rejections.push({
          kind: "score_outside_rubric",
          id: criterion.id,
          score: entry.suggestedScore,
        });
      }
    }
  }

  if (rejections.length > 0) return { ok: false, rejections };
  return { ok: true, suggestion };
}

/** Butir yang ditandai kurang bukti tidak boleh sekaligus membawa skor. */
export function isCoherent(entry: CriterionSuggestion): boolean {
  return !(entry.insufficientEvidence && entry.suggestedScore !== null);
}

export function studentArtifacts(packet: EvidencePacket): EvidenceArtifact[] {
  return packet.artifacts.filter((item) => item.studentAuthored);
}

export function scaffoldingArtifacts(
  packet: EvidencePacket,
): EvidenceArtifact[] {
  return packet.artifacts.filter((item) => !item.studentAuthored);
}
