/** @format */

import { createClient } from "@supabase/supabase-js";

// Baseline bersifat append-only dan tidak dapat dihapus siapa pun, sehingga
// pengujian attempt harus memakai unit sekali pakai agar dapat diulang.

const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
const serviceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];

export interface DisposableUnit {
  unitId: string;
  activityId: string;
  caseId: string;
  sourceId: string;
  sourceTitle: string;
  claimId: string;
}

export async function createDisposableUnit(): Promise<DisposableUnit> {
  if (!url || !serviceRoleKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY dibutuhkan untuk fixture E2E.",
    );
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: moduleRow, error: moduleError } = await supabase
    .from("modules")
    .select("id, class_id")
    .eq("status", "published")
    .order("sequence")
    .limit(1)
    .maybeSingle();

  if (moduleError || !moduleRow) {
    throw new Error(
      `Modul terbit tidak ditemukan; jalankan npm run db:seed:academics. ${moduleError?.message ?? ""}`,
    );
  }

  const { data: lecturer, error: lecturerError } = await supabase
    .from("class_lecturers")
    .select("lecturer_id")
    .eq("class_id", moduleRow.class_id)
    .limit(1)
    .maybeSingle();

  if (lecturerError || !lecturer) {
    throw new Error("Dosen pengampu kelas seed tidak ditemukan.");
  }

  const { data: lecturerProfile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", lecturer.lecturer_id)
    .single();

  const organizationId = lecturerProfile?.organization_id;
  if (!organizationId) {
    throw new Error("Organisasi dosen pengampu tidak ditemukan.");
  }

  const { data: last } = await supabase
    .from("learning_units")
    .select("sequence")
    .eq("module_id", moduleRow.id)
    .order("sequence", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sequence = (last?.sequence ?? 0) + 1;
  const stamp = new Date().toISOString();

  const { data: unit, error: unitError } = await supabase
    .from("learning_units")
    .insert({
      module_id: moduleRow.id,
      title: `Unit Uji Attempt ${stamp}`,
      objective:
        "Unit sekali pakai untuk pengujian otomatis respons awal mahasiswa.",
      sequence,
      status: "draft",
      created_by: lecturer.lecturer_id,
    })
    .select("id")
    .single();

  if (unitError || !unit) {
    throw new Error(`Gagal membuat unit uji: ${unitError?.message}`);
  }

  const { data: caseRow, error: caseError } = await supabase
    .from("cases")
    .insert({
      learning_unit_id: unit.id,
      title: "Kasus Uji Attempt",
      context: "Konteks kasus untuk pengujian otomatis",
      body: "Isi kasus untuk pengujian otomatis respons awal mahasiswa pada alur attempt-first.",
      key_question: "Bukti apa yang Anda perlukan untuk menilai kasus ini?",
      created_by: lecturer.lecturer_id,
    })
    .select("id")
    .single();

  if (caseError || !caseRow)
    throw new Error(`Gagal membuat kasus uji: ${caseError?.message}`);

  const { data: stage, error: stageError } = await supabase
    .from("learning_stages")
    .select("id")
    .eq("learning_unit_id", unit.id)
    .eq("stage_key", "interpretation")
    .single();

  if (stageError || !stage) {
    throw new Error("Tahap interpretasi tidak terbentuk untuk unit uji.");
  }

  const { data: activity, error: activityError } = await supabase
    .from("activities")
    .insert({
      learning_stage_id: stage.id,
      title: "Aktivitas Uji Attempt",
      prompt: "Tuliskan rumusan masalah kebijakan pada kasus tersebut.",
      activity_type: "written_response",
      allows_ai: true,
      allowed_ai_functions: ["guiding_questions"],
      sequence: 1,
      status: "published",
      created_by: lecturer.lecturer_id,
    })
    .select("id")
    .single();

  if (activityError || !activity) {
    throw new Error(`Gagal membuat aktivitas uji: ${activityError?.message}`);
  }

  const { error: publishError } = await supabase
    .from("learning_units")
    .update({ status: "published" })
    .eq("id", unit.id);

  if (publishError) {
    throw new Error(`Gagal menerbitkan unit uji: ${publishError.message}`);
  }

  // Sumber dan klaim juga sekali pakai: source_verifications append-only.
  const sourceTitle = `Sumber Uji ${stamp}`;
  const { data: source, error: sourceError } = await supabase
    .from("sources")
    .insert({
      organization_id: organizationId,
      title: sourceTitle,
      authors: "Tim Uji Otomatis",
      publisher: "Lembaga Uji",
      source_type: "report",
      created_by: lecturer.lecturer_id,
    })
    .select("id")
    .single();

  if (sourceError || !source) {
    throw new Error(`Gagal membuat sumber uji: ${sourceError?.message}`);
  }

  const { data: version, error: versionError } = await supabase
    .from("source_versions")
    .insert({
      source_id: source.id,
      version_label: "v1 — uji",
      retrieved_at: stamp,
      content_text:
        "Kutipan sumber untuk pengujian otomatis verifikasi enam kriteria.",
      created_by: lecturer.lecturer_id,
    })
    .select("id")
    .single();

  if (versionError || !version) {
    throw new Error(`Gagal membuat versi sumber uji: ${versionError?.message}`);
  }

  // Potongan ter-embed dibutuhkan agar retrieval RAG mengembalikan hasil.
  const raw = Array.from({ length: 1536 }, (_, index) => Math.sin(index + 1));
  const norm = Math.sqrt(raw.reduce((sum, value) => sum + value * value, 0));
  const embedding = JSON.stringify(raw.map((value) => value / norm));

  const { error: chunkError } = await supabase.from("source_chunks").insert({
    source_version_id: version.id,
    chunk_index: 0,
    content: "Kutipan sumber untuk pengujian otomatis alur bantuan AI.",
    token_count: 16,
    embedding,
    embedded_at: stamp,
  });

  if (chunkError) {
    throw new Error(`Gagal membuat potongan sumber uji: ${chunkError.message}`);
  }

  const { error: packError } = await supabase.from("case_sources").insert({
    case_id: caseRow.id,
    source_id: source.id,
    sequence: 1,
    is_required: true,
  });

  if (packError) {
    throw new Error(`Gagal melampirkan sumber uji: ${packError.message}`);
  }

  const { data: claim, error: claimError } = await supabase
    .from("claims")
    .insert({
      case_id: caseRow.id,
      origin: "case",
      text: "Klaim uji otomatis yang harus ditautkan ke bukti.",
      author_id: lecturer.lecturer_id,
    })
    .select("id")
    .single();

  if (claimError || !claim) {
    throw new Error(`Gagal membuat klaim uji: ${claimError?.message}`);
  }

  return {
    unitId: unit.id,
    activityId: activity.id,
    caseId: caseRow.id,
    sourceId: source.id,
    sourceTitle,
    claimId: claim.id,
  };
}
