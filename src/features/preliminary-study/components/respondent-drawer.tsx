/** @format */

"use client";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { DIMENSION_LABEL } from "@/lib/constants/stages";
import {
  categoryLevel,
  formatDecimal,
  formatSkillScore,
  groupAnswersBySkill,
  type PreliminaryCategory,
  type PreliminaryRespondent,
  type PreliminaryRespondentDetail,
} from "@/lib/research/preliminary-study";

import { CategoryMark } from "./category-mark";

export type RespondentDetailState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; detail: PreliminaryRespondentDetail };

function AnswerGroups({ detail }: { detail: PreliminaryRespondentDetail }) {
  return (
    <div data-slot="respondent-answers" className="flex flex-col gap-8">
      {groupAnswersBySkill(detail.answers).map((group) => (
        <section
          key={group.dimension}
          aria-labelledby={`answers-${group.dimension}`}
          className="flex flex-col gap-4"
        >
          <h3
            id={`answers-${group.dimension}`}
            className="flex items-baseline justify-between gap-3 border-b border-border pb-2"
          >
            <span className="text-sm font-semibold text-foreground">
              {DIMENSION_LABEL[group.dimension]}
            </span>
            <span className="font-mono text-xs text-muted-foreground tabular-nums">
              rata-rata {formatSkillScore(group.average)} /{" "}
              {detail.maxItemScore}
            </span>
          </h3>
          <ol className="flex flex-col gap-5">
            {group.answers.map((answer) => (
              <li key={answer.itemNumber} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-mono text-xs tracking-wide text-subtle uppercase">
                    Soal {answer.itemNumber}
                  </span>
                  <span className="font-mono text-xs text-foreground tabular-nums">
                    Skor {answer.score} / {detail.maxItemScore}
                  </span>
                </div>
                {answer.answer.trim() === "" ? (
                  <p className="text-sm text-muted-foreground italic">
                    Tidak menjawab
                  </p>
                ) : (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                    {answer.answer}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </section>
      ))}
      <p className="border-t border-border pt-4 font-mono text-xs text-subtle">
        Sumber: {detail.sourceSheet}, baris {detail.sourceRow}
      </p>
    </div>
  );
}

interface RespondentDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  respondent: PreliminaryRespondent | null;
  state: RespondentDetailState | undefined;
  categories: PreliminaryCategory[];
  maxTotal: number;
  onRetry: () => void;
}

export function RespondentDrawer({
  open,
  onOpenChange,
  respondent,
  state,
  categories,
  maxTotal,
  onRetry,
}: RespondentDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-xl"
      >
        {respondent ? (
          <>
            <SheetHeader className="gap-1 border-b border-border px-6 py-5 pr-14">
              <p className="font-mono text-xs tracking-widest text-subtle uppercase">
                Responden
              </p>
              <SheetTitle className="font-heading text-h3 font-semibold">
                {respondent.code}
              </SheetTitle>
              <SheetDescription className="flex flex-wrap items-center gap-x-2">
                <span className="inline-flex items-center gap-1.5">
                  <CategoryMark
                    level={categoryLevel(categories, respondent.category)}
                  />
                  {respondent.category}
                </span>
                <span aria-hidden="true">·</span>
                <span>Nilai {formatDecimal(respondent.score)}</span>
                <span aria-hidden="true">·</span>
                <span>
                  Total {respondent.total} dari {maxTotal}
                </span>
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              {state?.status === "ready" ? (
                <AnswerGroups detail={state.detail} />
              ) : state?.status === "error" ? (
                <div role="alert" className="flex flex-col items-start gap-3">
                  <p className="text-sm text-destructive">{state.message}</p>
                  <Button variant="outline" size="sm" onClick={onRetry}>
                    Coba lagi
                  </Button>
                </div>
              ) : (
                <div aria-busy="true" className="flex flex-col gap-6">
                  <p role="status" className="sr-only">
                    Memuat jawaban responden…
                  </p>
                  {[0, 1, 2].map((index) => (
                    <div key={index} className="flex flex-col gap-2">
                      <Skeleton className="h-3 w-28" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
