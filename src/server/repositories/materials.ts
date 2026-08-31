/** @format */

import "server-only";

import type { MaterialView } from "@/lib/materials/types";
import { createClient } from "@/lib/supabase/server";
import type {
  ExtractionStatus,
  MaterialKind,
  MaterialVisibility,
} from "@/lib/validation/materials";

import { unwrap } from "./shared";

export type { MaterialView };

const SELECT_COLUMNS = `id, title, description, resource_type, material_kind, status,
   visibility, sequence, url, storage_path, mime_type, size_bytes,
   original_filename, extraction_status, extracted_at, created_at, updated_at`;

type MaterialRow = {
  id: string;
  title: string;
  description: string | null;
  resource_type: string;
  material_kind: string | null;
  status: string;
  visibility: string;
  sequence: number | null;
  url: string | null;
  storage_path: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  original_filename: string | null;
  extraction_status: string;
  extracted_at: string | null;
  created_at: string;
  updated_at: string;
};

function toMaterialView(row: MaterialRow): MaterialView {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    resourceType: row.resource_type,
    materialKind: (row.material_kind as MaterialKind | null) ?? null,
    status: row.status as MaterialView["status"],
    visibility: row.visibility as MaterialVisibility,
    sequence: row.sequence,
    url: row.url,
    hasFile: row.storage_path !== null,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    originalFilename: row.original_filename,
    extractionStatus: row.extraction_status as ExtractionStatus,
    extractedAt: row.extracted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Tidak ada penyaring status maupun visibilitas di sini. RLS
 * `learning_resources_select` yang memutuskan: dosen pengampu melihat seluruh
 * bahan kelasnya, mahasiswa hanya yang terbit dan ditujukan kepadanya.
 * Menyalin aturannya ke sini hanya akan menciptakan sumber kebenaran kedua.
 */
export async function listClassMaterials(
  classId: string,
): Promise<MaterialView[]> {
  const supabase = await createClient();

  const rows = unwrap(
    await supabase
      .from("learning_resources")
      .select(SELECT_COLUMNS)
      .eq("class_id", classId)
      .is("deleted_at", null)
      .order("sequence", { ascending: true })
      .order("created_at", { ascending: true }),
    "listClassMaterials",
  );

  return rows.map(toMaterialView);
}

export async function getMaterial(
  materialId: string,
): Promise<MaterialView | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("learning_resources")
    .select(SELECT_COLUMNS)
    .eq("id", materialId)
    .is("deleted_at", null)
    .maybeSingle();

  return data ? toMaterialView(data) : null;
}

/** Nomor urut berikutnya dihitung dari data agar tidak bentrok antar dosen. */
export async function nextMaterialSequence(classId: string): Promise<number> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("learning_resources")
    .select("sequence")
    .eq("class_id", classId)
    .is("deleted_at", null)
    .order("sequence", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  return (data?.sequence ?? 0) + 1;
}
