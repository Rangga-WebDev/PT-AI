/** @format */

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import {
  deleteClassMessageAction,
  sendClassMessageAction,
} from "@/actions/courses/discussion";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  formatMessageTime,
  mergeMessage,
  MESSAGE_MAX_LENGTH,
  toClassMessageView,
  type ClassMessageRow,
  type ClassMessageView,
} from "@/lib/discussion/messages";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export interface DiscussionThread {
  id: string | null;
  label: string;
  href: string;
  draft: boolean;
}

// Pembaca yang menggulir ke atas tidak ditarik paksa ke pesan terbaru.
const STICKY_DISTANCE = 96;

export function ClassDiscussion({
  classId,
  moduleId,
  threads,
  initialMessages,
  currentUserId,
  canModerate,
}: {
  classId: string;
  moduleId: string | null;
  threads: DiscussionThread[];
  initialMessages: ClassMessageView[];
  currentUserId: string;
  canModerate: boolean;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const logRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  const active = threads.find((thread) => thread.id === moduleId) ?? threads[0];

  useEffect(() => {
    const supabase = createClient();
    let disposed = false;

    const accept = (payload: { new: unknown }) => {
      const message = toClassMessageView(payload.new as ClassMessageRow);
      if (message.moduleId !== moduleId) return;
      setMessages((list) => mergeMessage(list, message));
    };

    const filter = {
      schema: "public",
      table: "class_messages",
      filter: `class_id=eq.${classId}`,
    };

    const channel = supabase
      .channel(`diskusi-${classId}-${moduleId ?? "kelas"}`)
      .on("postgres_changes", { event: "INSERT", ...filter }, accept)
      .on("postgres_changes", { event: "UPDATE", ...filter }, accept);

    // Sesi dimuat dulu agar langganan memakai identitas pengguna, bukan anonim.
    void supabase.auth.getSession().then(() => {
      if (disposed) return;
      channel.subscribe((status) => setConnected(status === "SUBSCRIBED"));
    });

    return () => {
      disposed = true;
      void supabase.removeChannel(channel);
    };
  }, [classId, moduleId]);

  useEffect(() => {
    const log = logRef.current;
    if (log && stickToBottom.current) log.scrollTop = log.scrollHeight;
  }, [messages]);

  function trackScroll() {
    const log = logRef.current;
    if (!log) return;
    stickToBottom.current =
      log.scrollHeight - log.scrollTop - log.clientHeight < STICKY_DISTANCE;
  }

  function send() {
    const text = body.trim();
    if (!text || pending) return;

    setError(null);
    startTransition(async () => {
      const result = await sendClassMessageAction({
        classId,
        moduleId,
        body: text,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setBody("");
      stickToBottom.current = true;
      setMessages((list) => mergeMessage(list, result.message));
    });
  }

  function remove(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await deleteClassMessageAction(id);
      setConfirmingId(null);
      if (result.error) {
        setError(result.error);
        return;
      }
      setMessages((list) =>
        list.map((item) =>
          item.id === id ? { ...item, body: "", deleted: true } : item,
        ),
      );
    });
  }

  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <nav aria-label="Ruang diskusi" className="min-w-0">
        <div className="flex flex-col gap-2 lg:hidden">
          <Label htmlFor="discussion-thread">Ruang diskusi</Label>
          <select
            id="discussion-thread"
            value={active?.href ?? ""}
            onChange={(event) => router.push(event.target.value)}
            className="h-11 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
          >
            {threads.map((thread) => (
              <option key={thread.href} value={thread.href}>
                {thread.label}
                {thread.draft ? " (draf)" : ""}
              </option>
            ))}
          </select>
        </div>

        <ul className="hidden flex-col lg:flex">
          {threads.map((thread) => {
            const isActive = thread.id === moduleId;
            return (
              <li key={thread.href}>
                <Link
                  href={thread.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-baseline justify-between gap-2 border-l-2 py-2 pr-2 pl-3 text-sm transition-colors",
                    isActive
                      ? "border-primary font-medium text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span className="min-w-0 wrap-break-word">
                    {thread.label}
                  </span>
                  {thread.draft ? (
                    <span className="shrink-0 font-mono text-xs text-subtle">
                      draf
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <section
        aria-labelledby="discussion-heading"
        className="flex min-w-0 flex-col gap-4"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2
            id="discussion-heading"
            className="font-heading text-h3 font-semibold text-foreground"
          >
            {active?.label ?? "Diskusi kelas"}
          </h2>
          <span className="font-mono text-xs text-subtle">
            {connected ? "Pesan baru tampil otomatis" : "Menyambungkan…"}
          </span>
        </div>

        {active?.draft ? (
          <p className="border-l-2 border-destructive pl-3 text-sm text-foreground">
            Pertemuan ini masih draf. Mahasiswa belum dapat membuka diskusinya.
          </p>
        ) : null}

        <div
          ref={logRef}
          role="log"
          aria-label="Pesan diskusi"
          onScroll={trackScroll}
          className="flex max-h-[60vh] min-h-64 flex-col overflow-y-auto border-y border-border"
        >
          {messages.length === 0 ? (
            <p className="m-auto max-w-sm py-10 text-center text-sm text-muted-foreground">
              Belum ada pesan. Mulailah dengan pertanyaan atau tanggapan untuk
              seluruh anggota kelas.
            </p>
          ) : (
            <ol className="flex flex-col">
              {messages.map((message) => {
                const mine = message.authorId === currentUserId;
                const canDelete = !message.deleted && (canModerate || mine);
                return (
                  <li
                    key={message.id}
                    className="flex flex-col gap-1 border-b border-border py-3 last:border-b-0"
                  >
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="text-sm font-medium text-foreground">
                        {message.authorName}
                        {mine ? " (Anda)" : ""}
                      </span>
                      {message.authorRole === "lecturer" ? (
                        <span className="font-mono text-xs tracking-widest text-subtle uppercase">
                          Dosen
                        </span>
                      ) : null}
                      <time
                        dateTime={message.createdAt}
                        className="font-mono text-xs text-subtle"
                      >
                        {formatMessageTime(message.createdAt)}
                      </time>
                    </div>

                    {message.deleted ? (
                      <p className="text-sm text-subtle italic">
                        Pesan dihapus.
                      </p>
                    ) : (
                      <p className="max-w-prose text-sm wrap-break-word whitespace-pre-wrap text-foreground">
                        {message.body}
                      </p>
                    )}

                    {canDelete ? (
                      confirmingId === message.id ? (
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <span className="text-xs text-muted-foreground">
                            Hapus pesan ini untuk semua anggota?
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="danger"
                            disabled={pending}
                            onClick={() => remove(message.id)}
                          >
                            Ya, hapus
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setConfirmingId(null)}
                          >
                            Batal
                          </Button>
                        </div>
                      ) : (
                        <div>
                          <Button
                            type="button"
                            size="sm"
                            variant="link"
                            className="h-auto px-0 text-xs text-muted-foreground"
                            onClick={() => setConfirmingId(message.id)}
                          >
                            Hapus
                          </Button>
                        </div>
                      )
                    ) : null}
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        <form
          className="flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            send();
          }}
        >
          <Label htmlFor="discussion-message">Tulis pesan</Label>
          <Textarea
            id="discussion-message"
            rows={3}
            value={body}
            maxLength={MESSAGE_MAX_LENGTH}
            onChange={(event) => setBody(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                send();
              }
            }}
            placeholder="Tanyakan atau tanggapi materi pertemuan…"
          />
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-subtle">
              Enter untuk mengirim, Shift+Enter untuk baris baru · {body.length}
              /{MESSAGE_MAX_LENGTH}
            </span>
            <Button
              type="submit"
              size="sm"
              disabled={pending || body.trim().length === 0}
            >
              {pending ? "Mengirim…" : "Kirim"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
