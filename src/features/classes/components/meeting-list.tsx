/** @format */

import { StatusBadge } from "@/components/shared/status-badge";
import type { ModuleView } from "@/server/repositories/content";

/**
 * `modules` disebut "Pertemuan" di layar. Istilah tabelnya tidak pernah
 * sampai ke pengguna, dan nomornya diambil dari `sequence` supaya cocok
 * dengan penomoran di RPS.
 */
export function MeetingList({
  modules,
  showStatus,
}: {
  modules: ModuleView[];
  showStatus: boolean;
}) {
  return (
    <ol className="flex flex-col">
      {modules.map((module) => (
        <li
          key={module.id}
          className="flex flex-col gap-2 border-b border-border py-4 last:border-b-0"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="flex flex-col gap-1">
              <span className="font-mono text-xs tracking-widest text-subtle uppercase">
                Pertemuan {module.sequence}
              </span>
              <h3 className="font-medium text-foreground">{module.title}</h3>
            </div>
            {showStatus && module.status !== "published" ? (
              <StatusBadge status="draft">Belum terbit</StatusBadge>
            ) : null}
          </div>

          {module.description ? (
            <p className="max-w-prose text-sm whitespace-pre-wrap text-muted-foreground">
              {module.description}
            </p>
          ) : null}

          {module.units.length > 0 ? (
            // Unit PT-AI hanya disebut jumlahnya. Merincinya di sini akan
            // menggandakan tab PT-AI dan, pada kelas yang panjang, mengubur
            // pertemuan berikutnya.
            <p className="text-sm text-subtle">
              {module.units.length} unit PT-AI di dalam pertemuan ini
            </p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
