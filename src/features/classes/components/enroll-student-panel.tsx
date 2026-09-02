/** @format */

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  enrollStudentByLecturerAction,
  searchStudentsAction,
} from "@/actions/courses/classes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Candidate {
  id: string;
  fullName: string;
  identifier: string;
}

export function EnrollStudentPanel({ classId }: { classId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Candidate[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function search() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await searchStudentsAction(classId, query);
      if (result.ok) setResults(result.students);
      else setError(result.error);
    });
  }

  function enroll(student: Candidate) {
    setError(null);
    startTransition(async () => {
      const data = new FormData();
      data.append("classId", classId);
      data.append("studentId", student.id);

      const result = await enrollStudentByLecturerAction({}, data);
      if (result.error) {
        setError(result.error);
        return;
      }

      setMessage(`${student.fullName} berhasil didaftarkan.`);
      setResults((current) =>
        (current ?? []).filter((item) => item.id !== student.id),
      );
      router.refresh();
    });
  }

  if (!open) {
    return (
      <div>
        <Button
          type="button"
          size="sm"
          variant="primary"
          onClick={() => setOpen(true)}
        >
          + Tambah mahasiswa
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 border-b border-border pb-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-64 flex-1 flex-col gap-2">
          <Label htmlFor="student-search">Cari mahasiswa</Label>
          <Input
            id="student-search"
            value={query}
            placeholder="Nama atau NIM"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                search();
              }
            }}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="primary"
            onClick={search}
            disabled={pending || query.trim().length < 2}
          >
            {pending ? "Mencari…" : "Cari"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Tutup
          </Button>
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {message ? <p className="text-sm text-success">{message}</p> : null}

      {results !== null && results.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Tidak ada mahasiswa yang cocok dan belum terdaftar di kelas ini.
        </p>
      ) : null}

      {results !== null && results.length > 0 ? (
        <ul className="flex flex-col">
          {results.map((student) => (
            <li
              key={student.id}
              className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-2.5 text-sm last:border-b-0"
            >
              <span className="flex flex-col gap-0.5">
                <span className="text-foreground">{student.fullName}</span>
                <span className="font-mono text-xs text-subtle">
                  {student.identifier}
                </span>
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => enroll(student)}
              >
                Daftarkan
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
