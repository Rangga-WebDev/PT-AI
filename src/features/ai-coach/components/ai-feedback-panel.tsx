/** @format */

import { Flag, Sparkles, ThumbsUp, X } from "lucide-react";

import { AIFeedbackCard } from "@/components/cards/evidence-cards";
import { AIBoundaryNotice } from "@/features/ai-coach/components/ai-boundary-notice";
import { Button } from "@/components/ui/button";
import type { AIFeedbackItem } from "@/types/learning";

interface AIFeedbackPanelProps {
  items: AIFeedbackItem[];
}

/**
 * Prototipe visual: isi panel berasal dari mock statis, bukan model AI.
 * Setiap saran menyediakan aksi Terima, Abaikan, dan Laporkan.
 */
export function AIFeedbackPanel({ items }: AIFeedbackPanelProps) {
  return (
    <section
      aria-labelledby="ai-panel-heading"
      data-slot="ai-feedback-panel"
      className="flex flex-col gap-4"
    >
      <div className="flex items-center gap-2">
        <Sparkles aria-hidden="true" className="size-4 text-ai" />
        <h3
          id="ai-panel-heading"
          className="font-heading text-h4 font-semibold"
        >
          Umpan balik AI
        </h3>
      </div>
      <AIBoundaryNotice />
      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li key={item.id} className="flex flex-col gap-2">
            <AIFeedbackCard item={item} />
            <div className="flex flex-wrap gap-2">
              <Button variant="ai" size="sm" disabled>
                <ThumbsUp aria-hidden="true" />
                Terima
              </Button>
              <Button variant="ghost" size="sm" disabled>
                <X aria-hidden="true" />
                Abaikan
              </Button>
              <Button variant="ghost" size="sm" disabled>
                <Flag aria-hidden="true" />
                Laporkan
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <p className="font-mono text-xs text-subtle">
        Aksi dinonaktifkan pada prototipe visual. Pencatatan penerimaan,
        penolakan, dan pelaporan saran AI dibangun pada PHASE 10.
      </p>
    </section>
  );
}
