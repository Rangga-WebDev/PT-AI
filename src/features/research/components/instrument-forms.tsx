/** @format */

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  createInstrumentAction,
  recordMeasurementAction,
} from "@/actions/research/instruments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DIMENSION_LABEL, type CtDimension } from "@/lib/constants/stages";

const selectClass =
  "h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

const DIMENSIONS = Object.keys(DIMENSION_LABEL) as CtDimension[];

export function InstrumentForm({ classId }: { classId: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [assessmentType, setAssessmentType] = useState<"pretest" | "posttest">(
    "pretest",
  );
  const [maxScore, setMaxScore] = useState("100");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await createInstrumentAction({
        classId,
        title,
        assessmentType,
        maxScore,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      setTitle("");
      router.refresh();
    });
  }

  return (
    <div data-slot="instrument-form" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="instrument-title">Judul instrumen</Label>
        <Input
          id="instrument-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Misalnya: Pretest berpikir kritis PKn"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="instrument-type">Jenis</Label>
          <select
            id="instrument-type"
            className={selectClass}
            value={assessmentType}
            onChange={(event) =>
              setAssessmentType(event.target.value as "pretest" | "posttest")
            }
          >
            <option value="pretest">Pretest</option>
            <option value="posttest">Posttest</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="instrument-max">Skor maksimum</Label>
          <Input
            id="instrument-max"
            type="number"
            min={1}
            max={100}
            value={maxScore}
            onChange={(event) => setMaxScore(event.target.value)}
          />
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div>
        <Button
          data-slot="submit-instrument"
          onClick={submit}
          disabled={title.trim().length < 3 || isPending}
        >
          {isPending ? "Menyimpan…" : "Tambah instrumen"}
        </Button>
      </div>
    </div>
  );
}

interface MeasurementFormProps {
  assessmentId: string;
  students: { id: string; name: string }[];
}

export function MeasurementForm({
  assessmentId,
  students,
}: MeasurementFormProps) {
  const router = useRouter();
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [dimension, setDimension] = useState<CtDimension>("interpretation");
  const [score, setScore] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await recordMeasurementAction({
        assessmentId,
        studentId,
        dimension,
        score,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      setScore("");
      router.refresh();
    });
  }

  return (
    <div data-slot="measurement-form" className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`measurement-student-${assessmentId}`}>
            Mahasiswa
          </Label>
          <select
            id={`measurement-student-${assessmentId}`}
            className={selectClass}
            value={studentId}
            onChange={(event) => setStudentId(event.target.value)}
          >
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`measurement-dimension-${assessmentId}`}>
            Dimensi
          </Label>
          <select
            id={`measurement-dimension-${assessmentId}`}
            className={selectClass}
            value={dimension}
            onChange={(event) =>
              setDimension(event.target.value as CtDimension)
            }
          >
            {DIMENSIONS.map((item) => (
              <option key={item} value={item}>
                {DIMENSION_LABEL[item]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`measurement-score-${assessmentId}`}>Skor</Label>
          <Input
            id={`measurement-score-${assessmentId}`}
            type="number"
            min={0}
            max={100}
            value={score}
            onChange={(event) => setScore(event.target.value)}
          />
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div>
        <Button
          data-slot="submit-measurement"
          size="sm"
          variant="outline"
          onClick={submit}
          disabled={score.trim().length === 0 || !studentId || isPending}
        >
          {isPending ? "Menyimpan…" : "Simpan pengukuran"}
        </Button>
      </div>
    </div>
  );
}
