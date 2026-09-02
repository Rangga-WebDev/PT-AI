/** @format */

import type {
  MeetingPortfolio,
  PortfolioActivity,
  PortfolioCounts,
  TimelineEntry,
} from "./types";

/**
 * Agregasi murni: menerima artefak yang sudah dibaca dan menyusunnya per
 * pertemuan. Tidak menghitung nilai, tidak menyimpulkan penguasaan, dan tidak
 * menciptakan bukti yang tidak ada.
 */

export interface AggregateInput {
  meetings: { id: string; sequence: number; title: string }[];
  activities: {
    activityId: string;
    activityTitle: string;
    stageTitle: string;
    unitTitle: string;
    moduleId: string;
  }[];
  evidence: Map<string, Omit<PortfolioActivity, keyof ActivityIdentity>>;
}

type ActivityIdentity = {
  activityId: string;
  activityTitle: string;
  stageTitle: string;
  unitTitle: string;
};

function countEvidence(activities: PortfolioActivity[]): PortfolioCounts {
  return {
    activities: activities.length,
    revisions: activities.reduce(
      (total, item) => total + item.revisions.length,
      0,
    ),
    reflections: activities.filter((item) => item.reflection !== null).length,
    verifications: activities.reduce(
      (total, item) =>
        total +
        item.sourceVerifications.length +
        item.claimVerifications.length,
      0,
    ),
    aiAssistance: activities.reduce(
      (total, item) => total + item.aiAssistance.length,
      0,
    ),
    lecturerFeedback: activities.reduce(
      (total, item) => total + item.lecturerFeedback.length,
      0,
    ),
  };
}

/**
 * Durasi hanya dijumlahkan bila memang ada sesi tercatat. Nol yang berasal
 * dari ketiadaan data akan terbaca sebagai "nol menit", padahal artinya
 * "tidak terukur" — karena itu dibedakan dari null.
 */
function sumObserved(activities: PortfolioActivity[]): number | null {
  const measured = activities.filter((item) => item.observedSeconds !== null);
  if (measured.length === 0) return null;
  return measured.reduce(
    (total, item) => total + (item.observedSeconds ?? 0),
    0,
  );
}

export function aggregatePortfolio(input: AggregateInput): MeetingPortfolio[] {
  const byMeeting = new Map<string, PortfolioActivity[]>();

  for (const activity of input.activities) {
    const evidence = input.evidence.get(activity.activityId);
    if (!evidence) continue;

    const list = byMeeting.get(activity.moduleId) ?? [];
    list.push({
      activityId: activity.activityId,
      activityTitle: activity.activityTitle,
      stageTitle: activity.stageTitle,
      unitTitle: activity.unitTitle,
      ...evidence,
    });
    byMeeting.set(activity.moduleId, list);
  }

  return input.meetings
    .slice()
    .sort((a, b) => a.sequence - b.sequence)
    .map((meeting) => {
      const activities = (byMeeting.get(meeting.id) ?? []).sort((a, b) =>
        a.activityTitle.localeCompare(b.activityTitle, "id"),
      );

      const counts = countEvidence(activities);

      return {
        meeting,
        activities,
        counts,
        observedSeconds: sumObserved(activities),
        // Aktivitas tanpa satu pun artefak tidak dihitung sebagai bukti.
        hasEvidence:
          counts.revisions +
            counts.reflections +
            counts.verifications +
            counts.aiAssistance +
            counts.lecturerFeedback >
            0 || activities.some((item) => item.initialResponse !== null),
      };
    });
}

/**
 * Linimasa disusun dari artefak yang sama, bukan dari sumber kebenaran baru.
 * Ia hanya mengurutkan ulang apa yang sudah tampil di bagian lain.
 */
export function buildTimeline(activity: PortfolioActivity): TimelineEntry[] {
  const entries: TimelineEntry[] = [];

  if (activity.initialResponse) {
    entries.push({
      at: activity.initialResponse.submittedAt,
      kind: "initial_response",
      label: "Respons awal",
    });
  }

  for (const item of activity.aiAssistance) {
    entries.push({
      at: item.createdAt,
      kind: "ai_assistance",
      label: `Bantuan AI — ${item.title}`,
    });
  }

  for (const item of activity.sourceVerifications) {
    entries.push({
      at: item.createdAt,
      kind: "source_verification",
      label: `Verifikasi sumber${item.sourceTitle ? ` — ${item.sourceTitle}` : ""}`,
    });
  }

  for (const item of activity.claimVerifications) {
    entries.push({
      at: item.createdAt,
      kind: "claim_verification",
      label: "Verifikasi klaim",
    });
  }

  for (const item of activity.revisions) {
    entries.push({
      at: item.submittedAt,
      kind: "revision",
      label: `Revisi ${item.revisionNumber}`,
    });
  }

  if (activity.reflection) {
    entries.push({
      at: activity.reflection.submittedAt,
      kind: "reflection",
      label: "Refleksi",
    });
  }

  for (const item of activity.lecturerFeedback) {
    entries.push({
      at: item.createdAt,
      kind: "lecturer_feedback",
      label: "Umpan balik dosen",
    });
  }

  if (activity.mastery) {
    entries.push({
      at: activity.mastery.decidedAt,
      kind: "mastery",
      label: "Keputusan penguasaan",
    });
  }

  return entries.sort((a, b) => a.at.localeCompare(b.at));
}

export function formatObservedDuration(seconds: number | null): string | null {
  if (seconds === null || seconds <= 0) return null;

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} menit`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} jam` : `${hours} jam ${rest} menit`;
}
