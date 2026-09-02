/** @format */

import Link from "next/link";
import { notFound } from "next/navigation";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { QuickSetupLauncher } from "@/features/quick-setup/components/quick-setup-launcher";
import { summarizeDraft } from "@/lib/ai/quick-setup-schema";
import { requireLecturerOfClass } from "@/lib/supabase/auth";
import { getClassDetail } from "@/server/repositories/classes";
import { listQuickSetupDrafts } from "@/server/repositories/ai-drafts";
import { listClassMaterials } from "@/server/repositories/materials";

export default async function QuickSetupPage({
  params,
}: PageProps<"/app/lecturer/classes/[classId]/quick-setup">) {
  const { classId } = await params;

  await requireLecturerOfClass(classId);

  const [classItem, materials, drafts] = await Promise.all([
    getClassDetail(classId),
    listClassMaterials(classId),
    listQuickSetupDrafts(classId),
  ]);

  if (!classItem) notFound();

  // Hanya dokumen yang isinya benar-benar sudah terbaca yang boleh ditawarkan.
  const readable = materials
    .filter((material) => material.extractionStatus === "succeeded")
    .map((material) => ({
      id: material.id,
      title: material.title,
      extractedAt: material.extractedAt,
    }));

  return (
    <PageContainer>
      <PageHeader
        eyebrow={classItem.name}
        title="Quick Setup"
        description="AI menstrukturkan RPS atau CPMK yang sudah Anda unggah menjadi draf pembelajaran. Hasilnya selalu berupa draf dan tidak pernah diterapkan ke kelas dengan sendirinya."
        actions={
          <Link
            href="/app/lecturer/guide#quick-setup"
            className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Cara menyiapkan kelas dari RPS
          </Link>
        }
      />

      <div className="flex flex-col gap-10">
        <section className="flex flex-col gap-4">
          <h2 className="font-heading text-h3 font-semibold text-foreground">
            Susun draf baru
          </h2>
          <QuickSetupLauncher classId={classId} documents={readable} />
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="font-heading text-h3 font-semibold text-foreground">
            Draf tersimpan
          </h2>

          {drafts.length === 0 ? (
            <p className="text-sm text-subtle">
              Belum ada draf. Draf yang tersusun tetap tersimpan meski Anda
              menutup halaman ini.
            </p>
          ) : (
            <ul className="flex flex-col gap-4">
              {drafts.map((item) => {
                const summary = summarizeDraft(item.draft);
                return (
                  <li
                    key={item.id}
                    className="flex flex-col gap-3 border-b border-border pb-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex flex-col gap-1.5">
                      <span className="font-medium text-foreground">
                        {item.provenance.resourceTitle ?? "Dokumen tanpa judul"}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {summary.outcomes} CPMK/Sub-CPMK · {summary.meetings}{" "}
                        pertemuan · {summary.references} referensi
                        {summary.ptaiCandidates > 0
                          ? ` · ${summary.ptaiCandidates} usulan PT-AI`
                          : ""}
                      </span>
                      <StatusBadge
                        status={
                          item.status === "approved" ? "verified" : "draft"
                        }
                      >
                        {item.status === "approved"
                          ? "Disetujui"
                          : "Draf — belum diterapkan"}
                      </StatusBadge>
                    </div>
                    <Link
                      href={`/app/lecturer/classes/${classId}/quick-setup/${item.id}`}
                      className={buttonVariants({ size: "sm" })}
                    >
                      Tinjau draf
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </PageContainer>
  );
}
