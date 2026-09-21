/** @format */

"use client";

import Link from "next/link";
import { LogIn } from "lucide-react";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { requestEnrollmentAction } from "@/actions/courses/enrollment-requests";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  REQUEST_STATUS_LABEL,
  type StudentEnrollmentRequest,
} from "@/lib/classes/enrollment-requests";

export function JoinClassPanel({
  requests,
}: {
  requests: StudentEnrollmentRequest[];
}) {
  const [state, action, pending] = useActionState(requestEnrollmentAction, {});
  const router = useRouter();
  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);
  const error = state.error ?? state.fieldErrors?.joinCode?.[0];

  return (
    <section
      aria-labelledby="join-class-heading"
      className="flex min-w-0 flex-col gap-5 border-y border-border py-5"
    >
      <h2
        id="join-class-heading"
        className="font-heading text-h4 font-semibold"
      >
        Gabung kelas
      </h2>
      <form
        action={action}
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
        noValidate
      >
        <div className="flex w-full min-w-0 flex-col gap-2 sm:max-w-xs">
          <Label htmlFor="joinCode">Kode gabung dari dosen</Label>
          <Input
            id="joinCode"
            name="joinCode"
            maxLength={12}
            autoComplete="off"
            spellCheck={false}
            className="font-mono uppercase"
            required
            disabled={pending}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "join-code-error" : undefined}
          />
        </div>
        <Button type="submit" disabled={pending} className="shrink-0">
          <LogIn aria-hidden="true" />
          {pending ? "Mengirim..." : "Ajukan masuk"}
        </Button>
      </form>
      {error ? (
        <p
          id="join-code-error"
          role="alert"
          className="text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}
      {state.ok ? (
        <p role="status" className="text-sm text-success">
          {state.message}
        </p>
      ) : null}
      {requests.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">Pengajuan saya</h3>
          <ul className="divide-y divide-border">
            {requests.map((request) => (
              <li
                key={request.id}
                className="flex min-w-0 flex-col gap-2 py-3 sm:flex-row sm:justify-between sm:gap-5"
              >
                <div className="min-w-0">
                  <p className="wrap-break-word text-sm font-medium">
                    {request.class_name}
                  </p>
                  <p className="wrap-break-word text-sm text-muted-foreground">
                    {request.course_name}
                  </p>
                  {request.decision_note ? (
                    <p className="mt-2 wrap-break-word text-sm">
                      {request.decision_note}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col gap-1 text-sm sm:items-end">
                  <span
                    className={
                      request.status === "rejected"
                        ? "text-destructive"
                        : "text-muted-foreground"
                    }
                  >
                    {REQUEST_STATUS_LABEL[request.status] ?? request.status}
                  </span>
                  {request.status === "approved" ? (
                    <Link
                      href={`/app/student/classes/${request.class_id}`}
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      Buka kelas
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
