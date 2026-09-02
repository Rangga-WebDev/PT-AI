/** @format */

import { StatusBadge } from "@/components/shared/status-badge";
import {
  buildTimeline,
  formatObservedDuration,
} from "@/lib/portfolio/aggregate";
import type { PortfolioActivity } from "@/lib/portfolio/types";

const MASTERY_LABEL: Record<string, string> = {
  met: "Tercapai",
  partially_met: "Tercapai sebagian",
  not_met: "Belum tercapai",
};

const VERDICT_LABEL: Record<string, string> = {
  credible: "Kredibel",
  questionable: "Meragukan",
  not_credible: "Tidak kredibel",
};

const OUTCOME_LABEL: Record<string, string> = {
  verified: "Terverifikasi",
  unverified: "Tidak terverifikasi",
  unclear: "Belum jelas",
};

const AI_KIND_LABEL: Record<string, string> = {
  guiding_question: "Pertanyaan pemandu",
  strength: "Kekuatan",
  gap: "Kesenjangan",
  counter_argument: "Argumen tandingan",
  hint: "Petunjuk",
  recommendation: "Rekomendasi",
};

const REASON_LABEL: Record<string, string> = {
  ai_suggestion_accepted: "Menerima saran AI",
  ai_suggestion_rejected: "Menolak saran AI",
  new_evidence: "Bukti baru",
  lecturer_feedback: "Umpan balik dosen",
  self_review: "Tinjauan sendiri",
  other: "Lainnya",
};

const TIME = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function at(iso: string): string {
  return TIME.format(new Date(iso));
}

function Section({
  title,
  origin,
  children,
}: {
  title: string;
  origin?: "ai" | "lecturer" | undefined;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-2">
        <h4 className="font-mono text-xs tracking-widest text-subtle uppercase">
          {title}
        </h4>
        {origin === "ai" ? (
          <StatusBadge status="ai">Bantuan AI</StatusBadge>
        ) : null}
        {origin === "lecturer" ? (
          <StatusBadge status="verified">Dosen</StatusBadge>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function Prose({ children }: { children: string }) {
  return (
    <p className="max-w-prose text-sm whitespace-pre-wrap text-foreground">
      {children}
    </p>
  );
}

/**
 * Seluruh bagian hanya muncul bila artefaknya memang ada. Bagian kosong
 * dihilangkan, bukan diisi contoh.
 */
export function ActivityEvidence({
  activity,
}: {
  activity: PortfolioActivity;
}) {
  const timeline = buildTimeline(activity);
  const duration = formatObservedDuration(activity.observedSeconds);
  const latest = activity.revisions.at(-1) ?? null;

  return (
    <article className="flex flex-col gap-8 border-b border-border pb-10 last:border-b-0">
      <header className="flex flex-col gap-1">
        <span className="font-mono text-xs tracking-widest text-subtle uppercase">
          {activity.unitTitle} · {activity.stageTitle}
        </span>
        <h3 className="font-heading text-h3 font-semibold text-foreground">
          {activity.activityTitle}
        </h3>
        {duration ? (
          <p className="text-sm text-muted-foreground">
            Aktivitas belajar teramati: {duration}
          </p>
        ) : null}
      </header>

      {activity.initialResponse ? (
        <Section title="Respons awal">
          <p className="font-mono text-xs text-subtle">
            {at(activity.initialResponse.submittedAt)}
          </p>
          <Prose>{activity.initialResponse.content}</Prose>
        </Section>
      ) : null}

      {activity.aiAssistance.length > 0 ? (
        <Section title="Bantuan AI" origin="ai">
          <p className="text-xs text-subtle">
            Bantuan ini menuntun proses berpikir; isinya bukan jawaban
            mahasiswa.
          </p>
          <ul className="flex flex-col gap-4 border-l-2 border-ai/40 pl-4">
            {activity.aiAssistance.map((item) => (
              <li key={item.id} className="flex flex-col gap-1">
                <span className="font-mono text-xs text-subtle">
                  {AI_KIND_LABEL[item.kind] ?? item.kind} · {at(item.createdAt)}
                </span>
                <span className="text-sm font-medium text-foreground">
                  {item.title}
                </span>
                <span className="max-w-prose text-sm text-muted-foreground">
                  {item.body}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {activity.sourceVerifications.length > 0 ? (
        <Section title="Verifikasi sumber">
          <ul className="flex flex-col gap-3">
            {activity.sourceVerifications.map((item) => (
              <li key={item.id} className="flex flex-col gap-1">
                <span className="text-sm font-medium text-foreground">
                  {item.sourceTitle ?? "Sumber tanpa judul"}
                </span>
                <span className="font-mono text-xs text-subtle">
                  {VERDICT_LABEL[item.verdict] ?? item.verdict} ·{" "}
                  {at(item.createdAt)}
                </span>
                <span className="max-w-prose text-sm text-muted-foreground">
                  {item.note}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {activity.claimVerifications.length > 0 ? (
        <Section title="Verifikasi klaim">
          <ul className="flex flex-col gap-3">
            {activity.claimVerifications.map((item) => (
              <li key={item.id} className="flex flex-col gap-1">
                <span className="font-mono text-xs text-subtle">
                  {OUTCOME_LABEL[item.outcome] ?? item.outcome} ·{" "}
                  {at(item.createdAt)}
                </span>
                <span className="max-w-prose text-sm text-muted-foreground">
                  {item.note}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {activity.revisions.length > 0 ? (
        <Section title="Revisi">
          <ol className="flex flex-col gap-5">
            {activity.revisions.map((item) => (
              <li key={item.id} className="flex flex-col gap-1.5">
                <span className="font-mono text-xs text-subtle">
                  Revisi {item.revisionNumber} · {at(item.submittedAt)}
                  {latest && item.id === latest.id ? " · versi terakhir" : ""}
                </span>
                <Prose>{item.content}</Prose>
                {item.reasons.length > 0 ? (
                  <ul className="flex flex-col gap-0.5 text-xs text-subtle">
                    {item.reasons.map((reason) => (
                      <li key={reason.id}>
                        {REASON_LABEL[reason.reasonType] ?? reason.reasonType}:{" "}
                        {reason.detail}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ol>
        </Section>
      ) : null}

      {activity.reflection ? (
        <Section title="Refleksi">
          <p className="font-mono text-xs text-subtle">
            {at(activity.reflection.submittedAt)}
          </p>
          <dl className="flex flex-col gap-3">
            {activity.reflection.entries.map((entry) => (
              <div key={entry.label} className="flex flex-col gap-0.5">
                <dt className="text-xs text-subtle">{entry.label}</dt>
                <dd className="max-w-prose text-sm text-foreground">
                  {entry.value}
                </dd>
              </div>
            ))}
          </dl>
        </Section>
      ) : null}

      {activity.lecturerFeedback.length > 0 ? (
        <Section title="Umpan balik dosen" origin="lecturer">
          <ul className="flex flex-col gap-3 border-l-2 border-success/40 pl-4">
            {activity.lecturerFeedback.map((item) => (
              <li key={item.id} className="flex flex-col gap-1">
                <span className="font-mono text-xs text-subtle">
                  {item.authorName ?? "Dosen"} · {at(item.createdAt)}
                  {item.onRevisionNumber !== null
                    ? ` · pada revisi ${item.onRevisionNumber}`
                    : ""}
                </span>
                <span className="max-w-prose text-sm text-foreground">
                  {item.content}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {activity.mastery ? (
        <Section title="Penguasaan">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge
              status={
                activity.mastery.outcome === "met"
                  ? "verified"
                  : activity.mastery.outcome === "not_met"
                    ? "danger"
                    : "evidence"
              }
            >
              {MASTERY_LABEL[activity.mastery.outcome] ??
                activity.mastery.outcome}
            </StatusBadge>
            <span className="font-mono text-xs text-subtle">
              {activity.mastery.evaluatorKind === "lecturer"
                ? "Dinilai dosen"
                : "Pemeriksaan sistem"}
              {activity.mastery.score !== null
                ? ` · ${activity.mastery.score}`
                : ""}
              {activity.mastery.isFinal ? " · final" : " · sementara"}
            </span>
          </div>
        </Section>
      ) : null}

      {timeline.length > 1 ? (
        <Section title="Urutan proses">
          <ol className="flex flex-col gap-1.5">
            {timeline.map((entry, index) => (
              <li
                key={`${entry.kind}-${index}`}
                className="flex flex-wrap gap-3 text-sm"
              >
                <span className="w-28 shrink-0 font-mono text-xs text-subtle">
                  {at(entry.at)}
                </span>
                <span className="text-muted-foreground">{entry.label}</span>
              </li>
            ))}
          </ol>
        </Section>
      ) : null}
    </article>
  );
}
