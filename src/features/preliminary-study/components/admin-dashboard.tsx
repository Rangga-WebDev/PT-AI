/** @format */

"use client";

import { useState } from "react";

import { getPreliminaryRespondentAction } from "@/actions/research/preliminary-study";
import type {
  PreliminaryOverview,
  PreliminaryRespondent,
} from "@/lib/research/preliminary-study";

import { PreliminaryOverviewSections } from "./overview-sections";
import {
  RespondentDrawer,
  type RespondentDetailState,
} from "./respondent-drawer";
import { RespondentTable } from "./respondent-table";

const NETWORK_FAILURE =
  "Jawaban responden tidak dapat dimuat. Periksa koneksi, lalu coba lagi.";

/** Admin: ringkasan yang sama dengan dosen, ditambah skor dan jawaban per responden. */
export function PreliminaryStudyAdmin({
  overview,
  respondents,
}: {
  overview: PreliminaryOverview;
  respondents: PreliminaryRespondent[];
}) {
  const [category, setCategory] = useState<string | null>(null);
  const [viewing, setViewing] = useState<PreliminaryRespondent | null>(null);
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState<Record<string, RespondentDetailState>>(
    {},
  );
  const maxTotal = overview.dataset.itemCount * overview.dataset.maxItemScore;

  async function load(id: string) {
    setDetails((previous) => ({ ...previous, [id]: { status: "loading" } }));
    let next: RespondentDetailState;
    try {
      const result = await getPreliminaryRespondentAction(id);
      next = result.ok
        ? { status: "ready", detail: result.data }
        : { status: "error", message: result.error };
    } catch {
      next = { status: "error", message: NETWORK_FAILURE };
    }
    setDetails((previous) => ({ ...previous, [id]: next }));
  }

  // Jawaban yang sudah dimuat disimpan selama halaman terbuka; membuka ulang
  // responden yang sama tidak memanggil server lagi.
  function view(respondent: PreliminaryRespondent) {
    setViewing(respondent);
    setOpen(true);
    const state = details[respondent.id];
    if (!state || state.status === "error") void load(respondent.id);
  }

  return (
    <div className="flex flex-col gap-12">
      <PreliminaryOverviewSections
        overview={overview}
        selectedCategory={category}
        onSelectCategory={(label) =>
          setCategory((current) => (current === label ? null : label))
        }
      />
      <RespondentTable
        respondents={respondents}
        categories={overview.categories}
        maxTotal={maxTotal}
        category={category}
        onCategoryChange={setCategory}
        onView={view}
      />
      <RespondentDrawer
        open={open}
        onOpenChange={setOpen}
        respondent={viewing}
        state={viewing ? details[viewing.id] : undefined}
        categories={overview.categories}
        maxTotal={maxTotal}
        onRetry={() => {
          if (viewing) void load(viewing.id);
        }}
      />
    </div>
  );
}
