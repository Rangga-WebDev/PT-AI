/** @format */

export type ConsentStatus = "granted" | "declined" | "withdrawn";

export const CONSENT_STUDY_KEY = "pt-ai-critical-thinking-2026";
export const CONSENT_DOCUMENT_VERSION = "1.0";

export interface ConsentState {
  status: ConsentStatus | null;
  documentVersion: string | null;
}

export interface ConsentAvailability {
  canGrant: boolean;
  canWithdraw: boolean;
  isParticipant: boolean;
  notice: string;
}

/**
 * Menarik consent memutus pemetaan identitas ke pseudonim, bukan menghapus
 * jejak belajar yang bersifat append-only. Kalimat pemberitahuannya harus
 * menyatakan itu apa adanya agar persetujuan tetap berdasar informasi.
 */
export function evaluateConsent(state: ConsentState): ConsentAvailability {
  if (state.status === "granted") {
    return {
      canGrant: false,
      canWithdraw: true,
      isParticipant: true,
      notice:
        "Anda terdaftar sebagai partisipan. Menarik persetujuan akan memutus kaitan data Anda dengan identitas Anda secara permanen; jejak belajar tetap tersimpan untuk keperluan akademik, tetapi tidak dapat lagi dikaitkan kepada Anda oleh siapa pun.",
    };
  }

  if (state.status === "withdrawn") {
    return {
      canGrant: true,
      canWithdraw: false,
      isParticipant: false,
      notice:
        "Persetujuan Anda sudah ditarik dan kaitan identitas sudah diputus. Anda dapat ikut kembali, dan pseudonim baru akan dibuat.",
    };
  }

  if (state.status === "declined") {
    return {
      canGrant: true,
      canWithdraw: false,
      isParticipant: false,
      notice:
        "Anda menolak ikut serta. Keputusan ini tidak memengaruhi nilai maupun perlakuan akademik Anda, dan dapat diubah kapan saja.",
    };
  }

  return {
    canGrant: true,
    canWithdraw: false,
    isParticipant: false,
    notice:
      "Keikutsertaan bersifat sukarela dan tidak memengaruhi nilai. Dosen tidak dapat melihat keputusan Anda.",
  };
}

/** Versi dokumen yang berbeda menuntut persetujuan ulang. */
export function needsReconsent(state: ConsentState): boolean {
  return (
    state.status === "granted" &&
    state.documentVersion !== CONSENT_DOCUMENT_VERSION
  );
}

const PSEUDONYM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * Pseudonim dibuat acak, bukan diturunkan dari NIM atau nama. Turunan apa pun
 * dari identitas dapat dibalik dengan menebak, sehingga bukan anonimisasi.
 */
export function formatPseudonym(randomBytes: Uint8Array): string {
  let out = "";
  for (const byte of randomBytes) {
    out += PSEUDONYM_ALPHABET[byte % PSEUDONYM_ALPHABET.length];
  }
  return `P-${out}`;
}

export type RetentionAction = "anonymize" | "delete";

export interface RetentionRule {
  domainKey: string;
  retentionDays: number;
  action: RetentionAction;
  isActive: boolean;
}

export interface RetentionDomain {
  key: string;
  label: string;
  isAppendOnly: boolean;
}

/**
 * Domain append-only tidak dapat dihapus: trigger `prevent_mutation()` menolak
 * DELETE dari koneksi mana pun, termasuk service_role. Aturan retensi pada
 * domain itu hanya sah bila aksinya anonimisasi.
 */
export const RETENTION_DOMAINS: RetentionDomain[] = [
  {
    key: "research_participants",
    label: "Pemetaan identitas peserta penelitian",
    isAppendOnly: false,
  },
  {
    key: "learning_events",
    label: "Peristiwa pembelajaran",
    isAppendOnly: true,
  },
  { key: "ai_interactions", label: "Interaksi AI", isAppendOnly: true },
  { key: "attempts", label: "Respons awal dan revisi", isAppendOnly: true },
  { key: "notifications", label: "Notifikasi", isAppendOnly: false },
  { key: "audit_logs", label: "Log audit", isAppendOnly: true },
];

export interface RetentionValidation {
  ok: boolean;
  error?: string;
}

export function validateRetentionRule(
  rule: RetentionRule,
): RetentionValidation {
  const domain = RETENTION_DOMAINS.find((item) => item.key === rule.domainKey);

  if (!domain) {
    return { ok: false, error: "Domain retensi tidak dikenal." };
  }

  if (rule.retentionDays < 1) {
    return { ok: false, error: "Masa simpan minimal 1 hari." };
  }

  if (domain.isAppendOnly && rule.action === "delete") {
    return {
      ok: false,
      error: `${domain.label} bersifat append-only dan tidak dapat dihapus. Pilih anonimisasi.`,
    };
  }

  return { ok: true };
}

export interface RetentionCandidate {
  id: string;
  createdAt: string;
}

/** Baris yang sudah melewati masa simpan pada saat evaluasi. */
export function selectExpired(
  candidates: RetentionCandidate[],
  retentionDays: number,
  now: Date,
): RetentionCandidate[] {
  const cutoff = now.getTime() - retentionDays * 24 * 60 * 60 * 1000;
  return candidates.filter(
    (candidate) => Date.parse(candidate.createdAt) < cutoff,
  );
}
