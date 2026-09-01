/** @format */

import "server-only";

import {
  quickSetupDraftSchema,
  type QuickSetupDocumentType,
  type QuickSetupDraft,
} from "@/lib/ai/quick-setup-schema";
import { createClient } from "@/lib/supabase/server";

export interface DraftProvenanceView {
  resourceId: string | null;
  resourceTitle: string | null;
  checksum: string | null;
  extractedAt: string | null;
  documentType: QuickSetupDocumentType | null;
  instruction: string | null;
  truncated: boolean;
}

export interface QuickSetupDraftView {
  id: string;
  status: "draft" | "approved" | "discarded";
  model: string;
  promptVersion: number;
  createdAt: string;
  updatedAt: string;
  provenance: DraftProvenanceView;
  draft: QuickSetupDraft;
}

const SELECT_COLUMNS =
  "id, status, model, prompt_version, instruction, output, source_resource_id, created_at, updated_at";

interface DraftRow {
  id: string;
  status: string;
  model: string;
  prompt_version: number;
  instruction: unknown;
  output: string;
  source_resource_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Baris yang keluarannya tidak lagi lolos skema dilewati, bukan ditampilkan
 * setengah jadi: draf yang tak dapat dibaca utuh tidak layak jadi dasar
 * keputusan dosen.
 */
function toDraftView(row: DraftRow): QuickSetupDraftView | null {
  const parsedOutput = (() => {
    try {
      return quickSetupDraftSchema.safeParse(JSON.parse(row.output));
    } catch {
      return null;
    }
  })();

  if (!parsedOutput?.success) return null;

  const meta = (row.instruction ?? {}) as Record<string, unknown>;

  return {
    id: row.id,
    status: row.status as QuickSetupDraftView["status"],
    model: row.model,
    promptVersion: row.prompt_version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    provenance: {
      resourceId: row.source_resource_id,
      resourceTitle:
        typeof meta["resourceTitle"] === "string"
          ? meta["resourceTitle"]
          : null,
      checksum: typeof meta["checksum"] === "string" ? meta["checksum"] : null,
      extractedAt:
        typeof meta["extractedAt"] === "string" ? meta["extractedAt"] : null,
      documentType:
        typeof meta["documentType"] === "string"
          ? (meta["documentType"] as QuickSetupDocumentType)
          : null,
      instruction:
        typeof meta["instruction"] === "string" ? meta["instruction"] : null,
      truncated: meta["truncated"] === true,
    },
    draft: parsedOutput.data,
  };
}

export async function listQuickSetupDrafts(
  classId: string,
): Promise<QuickSetupDraftView[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("ai_material_drafts")
    .select(SELECT_COLUMNS)
    .eq("class_id", classId)
    .neq("status", "discarded")
    .order("created_at", { ascending: false })
    .limit(20);

  return (data ?? [])
    .map((row) => toDraftView(row as DraftRow))
    .filter((view): view is QuickSetupDraftView => view !== null);
}

export async function getQuickSetupDraft(
  draftId: string,
): Promise<QuickSetupDraftView | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("ai_material_drafts")
    .select(SELECT_COLUMNS)
    .eq("id", draftId)
    .maybeSingle();

  return data ? toDraftView(data as DraftRow) : null;
}
