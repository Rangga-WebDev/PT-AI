/** @format */

import type { Metadata } from "next";

import { AnalyticsCard } from "@/components/cards/insight-cards";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConsentForm } from "@/features/research/components/consent-form";
import {
  CONSENT_DOCUMENT_VERSION,
  CONSENT_STUDY_KEY,
  evaluateConsent,
  type ConsentStatus,
} from "@/lib/research/consent";
import { requireStudentAccess } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Persetujuan penelitian",
};

const STATUS_LABEL: Record<ConsentStatus, string> = {
  granted: "Bersedia ikut serta",
  declined: "Tidak bersedia",
  withdrawn: "Persetujuan ditarik",
};

const INFORMATION = [
  {
    title: "Apa yang diteliti",
    body: "Penelitian ini menelaah apakah pembelajaran berprogram berbantuan AI membantu mahasiswa berpikir lebih kritis pada mata kuliah Pendidikan Kewarganegaraan.",
  },
  {
    title: "Data apa yang dipakai",
    body: "Respons awal, revisi beserta alasannya, hasil verifikasi sumber, interaksi dengan AI, refleksi, dan skor rubrik. Data dipakai dalam bentuk berpseudonim.",
  },
  {
    title: "Siapa yang dapat melihat identitas Anda",
    body: "Tidak ada. Pemetaan identitas ke pseudonim disimpan terpisah dari data akademik dan tidak dapat dibaca dosen maupun administrator dari aplikasi.",
  },
  {
    title: "Pengaruh terhadap nilai",
    body: "Tidak ada sama sekali. Dosen tidak dapat melihat keputusan Anda, sehingga keikutsertaan tidak mungkin memengaruhi penilaian.",
  },
  {
    title: "Menarik persetujuan",
    body: "Anda boleh menarik persetujuan kapan saja. Saat ditarik, kaitan data Anda dengan identitas Anda diputus permanen. Jejak belajar tetap tersimpan karena dibutuhkan untuk keperluan akademik dan tidak dapat dihapus siapa pun, tetapi tidak lagi dapat dikaitkan kepada Anda.",
  },
];

export default async function StudentConsentPage() {
  const student = await requireStudentAccess();
  const supabase = await createClient();

  const { data } = await supabase
    .from("consent_records")
    .select("status, document_version, consented_at, withdrawn_at")
    .eq("profile_id", student.id)
    .eq("study_key", CONSENT_STUDY_KEY)
    .maybeSingle();

  const status = (data?.status ?? null) as ConsentStatus | null;
  const availability = evaluateConsent({
    status,
    documentVersion: data?.document_version ?? null,
  });

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Mahasiswa"
        title="Persetujuan keikutsertaan penelitian"
        description={`Lembar persetujuan versi ${CONSENT_DOCUMENT_VERSION}. Bacalah seluruhnya sebelum memutuskan.`}
        actions={
          status ? (
            <StatusBadge
              status={
                status === "granted"
                  ? "verified"
                  : status === "withdrawn"
                    ? "evidence"
                    : "info"
              }
            >
              {STATUS_LABEL[status]}
            </StatusBadge>
          ) : null
        }
      />

      <div className="flex flex-col gap-5">
        <AnalyticsCard
          title="Keterangan penelitian"
          description="Disampaikan lengkap agar persetujuan Anda berdasarkan informasi."
        >
          <dl data-slot="consent-information" className="flex flex-col gap-3">
            {INFORMATION.map((item) => (
              <div key={item.title} className="flex flex-col gap-0.5">
                <dt className="text-sm font-medium">{item.title}</dt>
                <dd className="text-sm text-muted-foreground">{item.body}</dd>
              </div>
            ))}
          </dl>
        </AnalyticsCard>

        <AnalyticsCard
          title="Keputusan Anda"
          description="Dapat diubah kapan saja."
        >
          <ConsentForm availability={availability} />
        </AnalyticsCard>
      </div>
    </PageContainer>
  );
}
