/** @format */

"use client";

import { useActionState, useState } from "react";

import { publishLecturerClassAction } from "@/actions/courses/classes";
import { Button } from "@/components/ui/button";

export function PublishClassControl({
  classId,
  status,
}: {
  classId: string;
  status: "draft" | "published" | "archived";
}) {
  const [state, formAction] = useActionState(publishLecturerClassAction, {});
  const [confirming, setConfirming] = useState(false);

  if (status === "archived") return null;

  const publishing = status === "draft";
  const next = publishing ? "published" : "draft";

  return (
    <div className="flex flex-col items-end gap-2">
      {publishing && confirming ? (
        <p className="max-w-xs text-right text-sm text-muted-foreground">
          Setelah diterbitkan, mahasiswa yang terdaftar dapat mengakses kelas.
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        {confirming ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setConfirming(false)}
          >
            Batal
          </Button>
        ) : null}

        {confirming ? (
          <form action={formAction}>
            <input type="hidden" name="classId" value={classId} />
            <input type="hidden" name="status" value={next} />
            <Button type="submit" size="sm" variant="primary">
              {publishing ? "Ya, terbitkan" : "Ya, kembalikan ke draf"}
            </Button>
          </form>
        ) : (
          <Button
            type="button"
            size="sm"
            variant={publishing ? "primary" : "outline"}
            onClick={() => setConfirming(true)}
          >
            {publishing ? "Terbitkan kelas" : "Kembalikan ke draf"}
          </Button>
        )}
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
    </div>
  );
}
