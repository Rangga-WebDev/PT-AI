/** @format */

import type * as React from "react";

import { PageContainer } from "@/components/layout/page-container";
import { ClassNav } from "@/features/classes/components/class-nav";
import type { ClassNavItem } from "@/lib/classes/navigation";
import type { ClassSummaryView } from "@/server/repositories/classes";

/**
 * Kepala kelas hanya menyebut yang benar-benar ada datanya. Metadata kosong
 * dihilangkan, bukan diisi tanda hubung.
 */
export function ClassShell({
  classItem,
  items,
  overviewHref,
  children,
}: {
  classItem: ClassSummaryView;
  items: ClassNavItem[];
  overviewHref: string;
  children: React.ReactNode;
}) {
  // Nama kelas biasanya sudah memuat nama mata kuliah; menyebut keduanya
  // hanya mengulang kata yang sama dua kali di dua baris berurutan.
  const meta = [
    classItem.courseName,
    classItem.academicPeriod,
    ...classItem.lecturerNames,
  ].filter((item) => item && !classItem.name.includes(item));

  return (
    <PageContainer>
      <header className="flex flex-col gap-4 pb-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h1 className="font-heading text-h2 font-semibold text-foreground">
            {classItem.name}
          </h1>
          {meta.length > 0 ? (
            <p className="text-sm text-muted-foreground">{meta.join(" · ")}</p>
          ) : null}
        </div>
        <ClassNav items={items} overviewHref={overviewHref} />
      </header>

      <div className="flex flex-col gap-6">{children}</div>
    </PageContainer>
  );
}
