/** @format */

import "server-only";

import type {
  ClaimLinkType,
  SourceType,
  VerificationVerdict,
} from "@/lib/constants/verification";
import { createClient } from "@/lib/supabase/server";

import { unwrap } from "./shared";

export interface SourceVersionView {
  id: string;
  versionLabel: string;
  retrievedAt: string;
  contentText: string | null;
  notes: string | null;
}

export interface SourceView {
  id: string;
  title: string;
  authors: string | null;
  publisher: string | null;
  sourceType: SourceType;
  publishedAt: string | null;
  url: string | null;
  curationNote: string | null;
  versions: SourceVersionView[];
}

export async function listSources(): Promise<SourceView[]> {
  const supabase = await createClient();

  const rows = unwrap(
    await supabase
      .from("sources")
      .select(
        `id, title, authors, publisher, source_type, published_at, url, curation_note,
         source_versions(id, version_label, retrieved_at, content_text, notes)`,
      )
      .is("deleted_at", null)
      .order("title"),
    "listSources",
  );

  return rows.map(toSourceView);
}

export async function getSource(sourceId: string): Promise<SourceView | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("sources")
    .select(
      `id, title, authors, publisher, source_type, published_at, url, curation_note,
       source_versions(id, version_label, retrieved_at, content_text, notes)`,
    )
    .eq("id", sourceId)
    .is("deleted_at", null)
    .maybeSingle();

  return data ? toSourceView(data) : null;
}

type SourceRow = {
  id: string;
  title: string;
  authors: string | null;
  publisher: string | null;
  source_type: SourceType;
  published_at: string | null;
  url: string | null;
  curation_note: string | null;
  source_versions: {
    id: string;
    version_label: string;
    retrieved_at: string;
    content_text: string | null;
    notes: string | null;
  }[];
};

function toSourceView(row: SourceRow): SourceView {
  return {
    id: row.id,
    title: row.title,
    authors: row.authors,
    publisher: row.publisher,
    sourceType: row.source_type,
    publishedAt: row.published_at,
    url: row.url,
    curationNote: row.curation_note,
    versions: row.source_versions
      .slice()
      .sort((a, b) => b.retrieved_at.localeCompare(a.retrieved_at))
      .map((version) => ({
        id: version.id,
        versionLabel: version.version_label,
        retrievedAt: version.retrieved_at,
        contentText: version.content_text,
        notes: version.notes,
      })),
  };
}

export interface CaseSourceView {
  sourceId: string;
  title: string;
  publisher: string | null;
  sourceType: SourceType;
  isRequired: boolean;
  sequence: number;
}

/** Source pack sebuah kasus; menjadi batas cakupan bukti dan RAG. */
export async function listCaseSources(
  caseId: string,
): Promise<CaseSourceView[]> {
  const supabase = await createClient();

  const rows = unwrap(
    await supabase
      .from("case_sources")
      .select(
        "sequence, is_required, sources!inner(id, title, publisher, source_type)",
      )
      .eq("case_id", caseId)
      .order("sequence"),
    "listCaseSources",
  );

  return rows.map((row) => ({
    sourceId: row.sources.id,
    title: row.sources.title,
    publisher: row.sources.publisher,
    sourceType: row.sources.source_type,
    isRequired: row.is_required,
    sequence: row.sequence,
  }));
}

export interface ClaimView {
  id: string;
  text: string;
  origin: string;
  links: {
    id: string;
    sourceId: string;
    sourceTitle: string;
    linkType: ClaimLinkType;
    note: string | null;
  }[];
}

/** Verifikasi selalu berlangsung dalam konteks satu aktivitas. */
export async function getCaseIdForActivity(
  activityId: string,
): Promise<string | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("activities")
    .select("learning_stages(learning_units(cases(id)))")
    .eq("id", activityId)
    .maybeSingle();

  return data?.learning_stages.learning_units.cases?.id ?? null;
}

export async function listCaseClaims(caseId: string): Promise<ClaimView[]> {
  const supabase = await createClient();

  const rows = unwrap(
    await supabase
      .from("claims")
      .select(
        `id, text, origin,
         claim_source_links(id, link_type, note, sources!inner(id, title))`,
      )
      .eq("case_id", caseId)
      .order("created_at"),
    "listCaseClaims",
  );

  return rows.map((claim) => ({
    id: claim.id,
    text: claim.text,
    origin: claim.origin,
    links: claim.claim_source_links.map((link) => ({
      id: link.id,
      sourceId: link.sources.id,
      sourceTitle: link.sources.title,
      linkType: link.link_type,
      note: link.note,
    })),
  }));
}

/** Sumber yang sudah diverifikasi mahasiswa pada aktivitas tertentu. */
export async function listVerifiedSourceIds(
  activityId: string,
  studentId: string,
): Promise<Set<string>> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("source_verifications")
    .select("source_id")
    .eq("activity_id", activityId)
    .eq("student_id", studentId);

  return new Set((data ?? []).map((row) => row.source_id));
}

export interface PendingSourceView extends CaseSourceView {
  activityId: string;
}

/**
 * Sumber pada unit terbit yang belum diverifikasi mahasiswa. RLS sudah
 * membatasi ke kelas yang diikuti, jadi tidak ada penyaringan kelas di sini.
 */
export async function listPendingSourcesForStudent(
  studentId: string,
): Promise<PendingSourceView[]> {
  const supabase = await createClient();

  const { data: cases } = await supabase
    .from("cases")
    .select(
      `id,
       learning_units!inner(status, learning_stages(activities(id, status, sequence)))`,
    )
    .eq("learning_units.status", "published")
    .is("deleted_at", null);

  if (!cases || cases.length === 0) return [];

  const { data: verified } = await supabase
    .from("source_verifications")
    .select("source_id")
    .eq("student_id", studentId);

  const verifiedIds = new Set((verified ?? []).map((row) => row.source_id));
  const pending: PendingSourceView[] = [];

  for (const caseRow of cases) {
    const activity = caseRow.learning_units.learning_stages
      .flatMap((stage) => stage.activities)
      .filter((item) => item.status === "published")
      .sort((a, b) => a.sequence - b.sequence)[0];

    if (!activity) continue;

    for (const source of await listCaseSources(caseRow.id)) {
      if (verifiedIds.has(source.sourceId)) continue;
      pending.push({ ...source, activityId: activity.id });
    }
  }

  return pending;
}

export interface VerificationView {
  id: string;
  verdict: VerificationVerdict;
  checklist: Record<string, boolean>;
  note: string;
  createdAt: string;
  sourceVersionId: string | null;
}

/**
 * Verifikasi bersifat append-only: penilaian ulang tersimpan sebagai baris
 * baru, dan riwayatnya justru menjadi data penelitian (LOCK-PED-012).
 */
export async function listStudentVerifications(
  sourceId: string,
  studentId: string,
): Promise<VerificationView[]> {
  const supabase = await createClient();

  const rows = unwrap(
    await supabase
      .from("source_verifications")
      .select("id, verdict, checklist, note, created_at, source_version_id")
      .eq("source_id", sourceId)
      .eq("student_id", studentId)
      .order("created_at", { ascending: false }),
    "listStudentVerifications",
  );

  return rows.map((row) => ({
    id: row.id,
    verdict: row.verdict,
    checklist: (row.checklist ?? {}) as Record<string, boolean>,
    note: row.note,
    createdAt: row.created_at,
    sourceVersionId: row.source_version_id,
  }));
}
