/** @format */

import Link from "next/link";
import { notFound } from "next/navigation";

import { AnalyticsCard } from "@/components/cards/insight-cards";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/states/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { CreateBranchingRuleForm } from "@/features/assessment/components/branching-rule-form";
import { requireLecturerOfClass } from "@/lib/supabase/auth";
import { getClassDetail } from "@/server/repositories/classes";
import {
  getUnitDetail,
  listModulesWithUnits,
} from "@/server/repositories/content";
import {
  listBranchingRules,
  listErrorCategories,
} from "@/server/repositories/mastery";

const ACTION_LABEL: Record<string, string> = {
  continue: "Lanjut",
  remedial: "Remedial",
  enrichment: "Pengayaan",
  hold: "Tahan",
};

export default async function BranchingRulesPage({
  params,
}: PageProps<"/app/lecturer/classes/[classId]/branching">) {
  const { classId } = await params;

  await requireLecturerOfClass(classId);

  const [classItem, modules, rules, errorCategories] = await Promise.all([
    getClassDetail(classId),
    listModulesWithUnits(classId),
    listBranchingRules(classId),
    listErrorCategories(),
  ]);

  if (!classItem) notFound();

  const units = modules.flatMap((module) => module.units);

  // Daftar aktivitas dikumpulkan per unit agar dosen memilih sasaran yang tepat.
  const details = await Promise.all(
    units.map((unit) => getUnitDetail(unit.id)),
  );

  const activities = details.flatMap((detail) =>
    detail
      ? detail.stages.flatMap((stage) =>
          stage.activities.map((activity) => ({
            id: activity.id,
            label: `${detail.unit.title} · ${stage.sequence}. ${stage.title} — ${activity.title}`,
          })),
        )
      : [],
  );

  return (
    <PageContainer>
      <PageHeader
        eyebrow={`${classItem.code} · ${classItem.academicPeriod}`}
        title="Aturan jalur belajar"
        description="Setiap aturan wajib menyertakan penjelasan. Keputusan yang dihasilkan dapat dibaca mahasiswa dan dapat Anda ubah kapan saja."
        actions={
          <Link
            href={`/app/lecturer/classes/${classId}`}
            className="text-sm underline underline-offset-4"
          >
            Kembali ke kelas
          </Link>
        }
      />

      <div className="flex flex-col gap-5">
        {activities.length > 0 ? (
          <AnalyticsCard
            title="Tambah aturan"
            description="Aturan memandu keputusan, tetapi keputusan akhir tetap di tangan Anda."
          >
            <CreateBranchingRuleForm
              activities={activities}
              errorCategories={errorCategories.map((category) => ({
                id: category.id,
                name: category.name,
              }))}
              units={units.map((unit) => ({
                id: unit.id,
                label: unit.title,
              }))}
            />
          </AnalyticsCard>
        ) : (
          <EmptyState description="Belum ada aktivitas pada kelas ini. Susun materi terlebih dahulu di perancang materi." />
        )}

        <AnalyticsCard
          title="Aturan aktif"
          description="Diurutkan berdasarkan prioritas."
        >
          {rules.length === 0 ? (
            <EmptyState description="Belum ada aturan jalur belajar." />
          ) : (
            <ul className="flex flex-col gap-2">
              {rules.map((rule) => (
                <li
                  key={rule.id}
                  className="flex flex-col gap-1 rounded-lg border border-border px-3 py-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm text-foreground">
                      {rule.activityTitle}
                    </span>
                    <div className="flex items-center gap-2">
                      <StatusBadge status="info" withDot={false}>
                        Prioritas {rule.priority}
                      </StatusBadge>
                      <StatusBadge
                        status={
                          rule.action === "remedial"
                            ? "evidence"
                            : rule.action === "hold"
                              ? "danger"
                              : "verified"
                        }
                      >
                        {ACTION_LABEL[rule.action] ?? rule.action}
                      </StatusBadge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {rule.explanation}
                  </p>
                  {rule.errorCategory ? (
                    <span className="font-mono text-xs text-subtle">
                      Kategori: {rule.errorCategory}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </AnalyticsCard>
      </div>
    </PageContainer>
  );
}
