/** @format */

import Link from "next/link";
import { notFound } from "next/navigation";

import { PageContainer } from "@/components/layout/page-container";
import { buttonVariants } from "@/components/ui/button";
import { formatMaterialDate } from "@/lib/materials/labels";
import { requireClassAccess } from "@/lib/supabase/auth";
import { getReadableMaterial } from "@/server/repositories/materials";

export default async function StudentMaterialReadingPage({
  params,
}: PageProps<"/app/student/classes/[classId]/materials/[materialId]">) {
  const { classId, materialId } = await params;

  await requireClassAccess(classId);

  const material = await getReadableMaterial(materialId);

  // Bahan milik kelas lain tidak boleh terbaca lewat jalur kelas ini, meski
  // mahasiswanya kebetulan berhak atas keduanya.
  if (!material || material.classId !== classId) notFound();

  return (
    <PageContainer>
      <article className="reading-surface mx-auto flex w-full max-w-2xl flex-col gap-6 rounded-xl border border-reading-border p-6 md:p-8">
        <header className="flex flex-col gap-2">
          <h1 className="font-heading text-h2 font-semibold text-foreground">
            {material.title}
          </h1>
          <p className="font-mono text-xs text-subtle">
            {formatMaterialDate(material.createdAt)}
          </p>
          {material.description ? (
            <p className="text-sm text-muted-foreground">
              {material.description}
            </p>
          ) : null}
        </header>

        {material.text ? (
          // Ditulis sebagai teks, bukan HTML: isi dari luar tidak pernah
          // ditafsirkan sebagai markup.
          <div className="reading-prose text-base whitespace-pre-wrap text-foreground">
            {material.text}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Isi materi ini belum dapat ditampilkan.
          </p>
        )}
      </article>

      <div className="mx-auto w-full max-w-2xl pt-6">
        <Link
          href={`/app/student/classes/${classId}/materials`}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Kembali ke Materi
        </Link>
      </div>
    </PageContainer>
  );
}
