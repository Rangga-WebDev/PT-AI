/** @format */

import { PageHeader } from "@/components/layout/page-header";
import {
  formatImportedAt,
  type PreliminaryOverview,
} from "@/lib/research/preliminary-study";

const DEFAULT_TITLE = "Tes kemampuan berpikir kritis kewarganegaraan";

export function PreliminaryStudyHeader({
  overview,
  audience,
}: {
  overview: PreliminaryOverview | null;
  audience: "admin" | "lecturer";
}) {
  if (!overview) {
    return (
      <PageHeader
        eyebrow="Studi pendahuluan"
        title={DEFAULT_TITLE}
        description="Hasil tes awal mahasiswa sebelum implementasi model, terpisah dari data kelas."
      />
    );
  }

  const { dataset, summary, skills } = overview;
  const maxTotal = dataset.itemCount * dataset.maxItemScore;
  const scope =
    audience === "lecturer"
      ? " Dosen melihat ringkasan kelompok; jawaban per responden hanya dibuka administrator."
      : "";

  return (
    <>
      <PageHeader
        eyebrow="Studi pendahuluan"
        title={dataset.title}
        description={`Hasil tes awal ${summary.respondents} mahasiswa sebelum implementasi model: ${dataset.itemCount} soal esai untuk ${skills.length} kecakapan, skor 0–${dataset.maxItemScore} per soal. Nilai 0–100 adalah total skor dibagi ${maxTotal}.${scope}`}
        className="pb-3 md:pb-4"
      />
      <p
        data-slot="preliminary-source"
        className="mb-8 font-mono text-xs text-subtle md:mb-10"
      >
        Sumber: {dataset.sourceSheet} · diimpor{" "}
        {formatImportedAt(dataset.importedAt)}
      </p>
    </>
  );
}
