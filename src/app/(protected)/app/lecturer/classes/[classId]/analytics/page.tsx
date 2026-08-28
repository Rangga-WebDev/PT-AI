/** @format */

import { notFound } from "next/navigation";

import { AnalyticsCard } from "@/components/cards/insight-cards";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/states/empty-state";
import {
  EventSummary,
  FidelitySummary,
  MasteryDistribution,
  ObservationList,
} from "@/features/analytics/components/analytics-cards";
import { FidelityForm } from "@/features/analytics/components/fidelity-form";
import {
  FIDELITY_CHECKLIST,
  fidelityRate,
  summarizeMasteryDistribution,
} from "@/lib/analytics/aggregate";
import { requireLecturerOfClass } from "@/lib/supabase/auth";
import {
  getClassMasterySnapshot,
  listClassObservations,
  listFidelityRecords,
  summarizeClassEvents,
} from "@/server/repositories/analytics";
import { getClassDetail } from "@/server/repositories/classes";

export default async function ClassAnalyticsPage({
  params,
}: PageProps<"/app/lecturer/classes/[classId]/analytics">) {
  const { classId } = await params;

  await requireLecturerOfClass(classId);

  const [classItem, snapshot, events, fidelity, observations] =
    await Promise.all([
      getClassDetail(classId),
      getClassMasterySnapshot(classId),
      summarizeClassEvents(classId),
      listFidelityRecords(classId),
      listClassObservations(classId),
    ]);

  if (!classItem) notFound();

  const latestFidelity = new Map<string, boolean>();
  for (const record of fidelity) {
    latestFidelity.set(record.checklistKey, record.isImplemented);
  }

  return (
    <PageContainer>
      <PageHeader
        eyebrow={`${classItem.courseName} · ${classItem.code}`}
        title="Analitik kelas"
        description="Ringkasan proses, bukan penilaian akhir. Angka di sini menggambarkan apa yang dikerjakan mahasiswa, sedangkan mutu penalaran tetap Anda yang menilai."
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <AnalyticsCard
          title="Distribusi ketuntasan"
          description={`${snapshot.enrolledCount} mahasiswa terdaftar.`}
        >
          {snapshot.enrolledCount === 0 ? (
            <EmptyState description="Belum ada mahasiswa terdaftar." />
          ) : (
            <MasteryDistribution
              slices={summarizeMasteryDistribution(snapshot)}
            />
          )}
        </AnalyticsCard>

        <AnalyticsCard
          title="Aktivitas tercatat"
          description="Peristiwa nyata yang tersimpan, bukan estimasi."
        >
          {events.length === 0 ? (
            <EmptyState description="Belum ada peristiwa tercatat pada kelas ini." />
          ) : (
            <EventSummary rows={events} />
          )}
        </AnalyticsCard>

        <AnalyticsCard
          title="Pengamatan proses"
          description="Pernyataan faktual tentang pekerjaan, bukan label tentang mahasiswa."
        >
          {observations.length === 0 ? (
            <EmptyState description="Tidak ada pengamatan yang perlu ditindaklanjuti." />
          ) : (
            <ObservationList observations={observations} />
          )}
        </AnalyticsCard>

        <AnalyticsCard
          title="Keterlaksanaan model"
          description="Checklist observasi untuk kebutuhan penelitian."
        >
          <div className="flex flex-col gap-4">
            <FidelitySummary
              rate={fidelityRate(fidelity)}
              items={FIDELITY_CHECKLIST.map((item) => ({
                key: item.key,
                label: item.label,
                isImplemented: latestFidelity.get(item.key) ?? null,
              }))}
            />
            <FidelityForm
              classId={classId}
              current={Object.fromEntries(
                FIDELITY_CHECKLIST.map((item) => [
                  item.key,
                  latestFidelity.get(item.key) ?? null,
                ]),
              )}
            />
          </div>
        </AnalyticsCard>
      </div>
    </PageContainer>
  );
}
