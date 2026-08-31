/** @format */

"use client";

import { useEffect, useRef } from "react";

import {
  endActivitySession,
  heartbeatActivitySession,
} from "@/actions/learning/sessions";
import { HEARTBEAT_INTERVAL_MS, IDLE_CUTOFF_MS } from "@/lib/analytics/session";

/**
 * Melapor bahwa mahasiswa sedang aktif pada satu aktivitas. Tidak menampilkan
 * apa pun: metrik ini untuk kebutuhan penelitian, bukan untuk mengawasi
 * mahasiswa di layar mereka sendiri.
 *
 * Laporan berhenti saat tab disembunyikan atau tidak ada interaksi selama
 * batas idle, sehingga tab yang ditinggalkan tidak menambah durasi.
 */
export function ActivitySessionTracker({ activityId }: { activityId: string }) {
  const lastInteractionRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    lastInteractionRef.current = Date.now();

    function markInteraction() {
      lastInteractionRef.current = Date.now();
    }

    const events = ["pointerdown", "keydown", "scroll", "focus"] as const;
    for (const name of events) {
      window.addEventListener(name, markInteraction, { passive: true });
    }

    function tick() {
      if (cancelled) return;
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastInteractionRef.current >= IDLE_CUTOFF_MS) return;

      void heartbeatActivitySession({ activityId });
    }

    void heartbeatActivitySession({ activityId });
    const timer = window.setInterval(tick, HEARTBEAT_INTERVAL_MS);

    function close() {
      void endActivitySession({ activityId });
    }

    window.addEventListener("pagehide", close);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      for (const name of events) {
        window.removeEventListener(name, markInteraction);
      }
      window.removeEventListener("pagehide", close);
      close();
    };
  }, [activityId]);

  return null;
}
