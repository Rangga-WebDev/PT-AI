/** @format */

import { notFound } from "next/navigation";

import { AnalyticsCard } from "@/components/cards/insight-cards";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/states/empty-state";
import {
  InstrumentForm,
  MeasurementForm,
} from "@/features/research/components/instrument-forms";
import { requireLecturerOfClass } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import {
  getClassDetail,
  listClassMembers,
} from "@/server/repositories/classes";

const TYPE_LABEL: Record<string, string> = {
  pretest: "Pretest",
  posttest: "Posttest",
};

export default async function ClassInstrumentsPage({
  params,
}: PageProps<"/app/lecturer/classes/[classId]/instruments">) {
  const { classId } = await params;

  await requireLecturerOfClass(classId);

  const supabase = await createClient();

  const [classItem, members, instruments] = await Promise.all([
    getClassDetail(classId),
    listClassMembers(classId),
    supabase
      .from("assessments")
      .select("id, title, assessment_type, max_score, created_at")
      .eq("class_id", classId)
      .in("assessment_type", ["pretest", "posttest"])
      .order("created_at"),
  ]);

  if (!classItem) notFound();

  const rows = instruments.data ?? [];
  // `ClassMemberView.id` adalah id pendaftaran, bukan profil; skor merujuk profil.
  const students = members.students.map((student) => ({
    id: student.profileId,
    name: student.fullName,
  }));

  return (
    <PageContainer>
      <PageHeader
        eyebrow={`${classItem.courseName} · ${classItem.code}`}
        title="Instrumen pretest dan posttest"
        description="Skor instrumen tersimpan terpisah dari penilaian rubrik, sehingga perbandingan sebelum dan sesudah perlakuan tetap sah untuk penelitian."
      />

      <div className="flex flex-col gap-5">
        <AnalyticsCard
          title="Tambah instrumen"
          description="Satu instrumen untuk setiap pengukuran."
        >
          <InstrumentForm classId={classId} />
        </AnalyticsCard>

        <AnalyticsCard
          title="Instrumen kelas ini"
          description="Pengukuran per dimensi dicatat di bawah masing-masing instrumen."
        >
          {rows.length === 0 ? (
            <EmptyState description="Belum ada instrumen pretest atau posttest." />
          ) : (
            <ul className="flex flex-col gap-4">
              {rows.map((row) => (
                <li
                  key={row.id}
                  data-slot="instrument-item"
                  className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium">{row.title}</span>
                    <StatusBadge
                      status={
                        row.assessment_type === "pretest" ? "info" : "verified"
                      }
                    >
                      {TYPE_LABEL[row.assessment_type] ?? row.assessment_type}
                    </StatusBadge>
                  </div>

                  {students.length === 0 ? (
                    <EmptyState description="Belum ada mahasiswa terdaftar pada kelas ini." />
                  ) : (
                    <MeasurementForm
                      assessmentId={row.id}
                      students={students}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </AnalyticsCard>
      </div>
    </PageContainer>
  );
}
