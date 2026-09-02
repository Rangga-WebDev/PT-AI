/** @format */

import type { QuickSetupDraft } from "@/lib/ai/quick-setup-schema";

/**
 * Pertemuan dipetakan ke `modules`, bukan ke `learning_units`. Membuat unit
 * akan memicu trigger yang menyemai enam tahap berpikir kritis untuk setiap
 * pertemuan, dan itu berarti memutuskan atas nama dosen bahwa setiap pertemuan
 * adalah unit PT-AI. Modul tidak punya efek samping seperti itu, dan urutannya
 * unik per kelas sehingga pemetaannya satu lawan satu dengan nomor pertemuan.
 */

export type ApplySection = "meetings";

export interface ExistingModule {
  sequence: number;
  title: string;
}

export interface PlannedModule {
  sequence: number;
  title: string;
  description: string | null;
}

export interface SkippedModule {
  sequence: number;
  draftTitle: string;
  existingTitle: string;
}

export interface ApplyPlan {
  create: PlannedModule[];
  skip: SkippedModule[];
  ptaiCandidates: {
    sequence: number;
    title: string;
    rationale: string | null;
  }[];
  /** Bagian draf yang belum punya tempat sah di skema. */
  unsupported: { section: string; reason: string }[];
}

const MAX_DESCRIPTION = 2000;

/**
 * Topik dan tujuan disatukan ke deskripsi modul karena tidak ada kolom lain
 * yang menampungnya. Saran AI sengaja tidak ikut: yang tertulis di struktur
 * kelas harus berasal dari dokumen dosen.
 */
function describeMeeting(
  meeting: QuickSetupDraft["meetings"][number],
): string | null {
  const parts: string[] = [];

  if (meeting.topic) parts.push(meeting.topic);
  if (meeting.objectives.length > 0) {
    parts.push(meeting.objectives.map((item) => `— ${item}`).join("\n"));
  }

  if (parts.length === 0) return null;
  return parts.join("\n\n").slice(0, MAX_DESCRIPTION);
}

/**
 * Bawaannya mempertahankan yang sudah ada. Pertemuan yang nomornya sudah
 * terpakai dilewati dan dilaporkan, tidak pernah ditimpa — isi buatan dosen
 * lebih berharga daripada usulan mesin.
 */
export function buildApplyPlan(
  draft: QuickSetupDraft,
  existing: ExistingModule[],
): ApplyPlan {
  const bySequence = new Map(existing.map((item) => [item.sequence, item]));
  const seen = new Set<number>();

  const create: PlannedModule[] = [];
  const skip: SkippedModule[] = [];

  for (const meeting of [...draft.meetings].sort(
    (a, b) => a.sequence - b.sequence,
  )) {
    const occupied = bySequence.get(meeting.sequence);

    // Draf yang menyebut nomor pertemuan dua kali tetap hanya menghasilkan satu
    // modul; sisanya dilaporkan sebagai bentrok dengan dirinya sendiri.
    if (occupied || seen.has(meeting.sequence)) {
      skip.push({
        sequence: meeting.sequence,
        draftTitle: meeting.title,
        existingTitle: occupied?.title ?? meeting.title,
      });
      continue;
    }

    seen.add(meeting.sequence);
    create.push({
      sequence: meeting.sequence,
      title: meeting.title,
      description: describeMeeting(meeting),
    });
  }

  const unsupported: ApplyPlan["unsupported"] = [];

  if (draft.learningOutcomes.length > 0) {
    unsupported.push({
      section: "CPMK / Sub-CPMK",
      reason:
        "Belum ada tempat penyimpanan capaian pembelajaran tingkat mata kuliah pada basis data. Isinya tetap tersimpan di draf ini.",
    });
  }

  if (draft.references.length > 0) {
    unsupported.push({
      section: "Referensi",
      reason:
        "Bahan ajar menuntut tautan atau berkas, sedangkan referensi di dokumen hanya berupa judul.",
    });
  }

  return {
    create,
    skip,
    ptaiCandidates: draft.meetings
      .filter((meeting) => meeting.ptaiCandidate)
      .map((meeting) => ({
        sequence: meeting.sequence,
        title: meeting.title,
        rationale: meeting.ptaiRationale ?? null,
      })),
    unsupported,
  };
}
