/** @format */

/**
 * Kontrak portofolio. Seluruh isinya berasal dari artefak yang sudah tercatat
 * PT-AI — tidak ada nilai yang dihitung ulang, tidak ada penilaian baru, dan
 * tidak ada tabel portofolio tersendiri.
 */

export interface PortfolioMeetingRef {
  id: string;
  sequence: number;
  title: string;
}

export interface PortfolioResponse {
  id: string;
  content: string;
  submittedAt: string;
}

export interface PortfolioRevision {
  id: string;
  revisionNumber: number;
  content: string;
  submittedAt: string;
  reasons: { id: string; reasonType: string; detail: string }[];
}

export interface PortfolioSourceVerification {
  id: string;
  sourceTitle: string | null;
  verdict: string;
  note: string;
  createdAt: string;
}

export interface PortfolioClaimVerification {
  id: string;
  subjectKind: string;
  outcome: string;
  note: string;
  createdAt: string;
}

export interface PortfolioAiAssistance {
  id: string;
  kind: string;
  title: string;
  body: string;
  dimension: string | null;
  studentAction: string;
  createdAt: string;
}

export interface PortfolioReflection {
  id: string;
  submittedAt: string;
  entries: { label: string; value: string }[];
}

export interface PortfolioLecturerFeedback {
  id: string;
  content: string;
  authorName: string | null;
  createdAt: string;
  onRevisionNumber: number | null;
}

export interface PortfolioMastery {
  outcome: string;
  score: number | null;
  evaluatorKind: string;
  isFinal: boolean;
  decidedAt: string;
}

export interface PortfolioActivity {
  activityId: string;
  activityTitle: string;
  stageTitle: string;
  unitTitle: string;
  initialResponse: PortfolioResponse | null;
  revisions: PortfolioRevision[];
  sourceVerifications: PortfolioSourceVerification[];
  claimVerifications: PortfolioClaimVerification[];
  aiAssistance: PortfolioAiAssistance[];
  reflection: PortfolioReflection | null;
  lecturerFeedback: PortfolioLecturerFeedback[];
  mastery: PortfolioMastery | null;
  /** Perkiraan keterlibatan dari `learning_sessions`, bukan waktu berpikir. */
  observedSeconds: number | null;
}

export interface PortfolioCounts {
  activities: number;
  revisions: number;
  reflections: number;
  verifications: number;
  aiAssistance: number;
  lecturerFeedback: number;
}

export interface MeetingPortfolio {
  meeting: PortfolioMeetingRef;
  activities: PortfolioActivity[];
  counts: PortfolioCounts;
  observedSeconds: number | null;
  hasEvidence: boolean;
}

export type TimelineKind =
  | "initial_response"
  | "ai_assistance"
  | "source_verification"
  | "claim_verification"
  | "revision"
  | "reflection"
  | "lecturer_feedback"
  | "mastery";

export interface TimelineEntry {
  at: string;
  kind: TimelineKind;
  label: string;
}
