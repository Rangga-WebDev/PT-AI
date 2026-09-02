/** @format */

"use client";

import { useState } from "react";

import { createLecturerClassAction } from "@/actions/courses/classes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ActionForm,
  FieldError,
} from "@/features/administration/components/action-form";

const selectClass =
  "h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

export interface CourseOption {
  id: string;
  name: string;
  code: string;
}

export interface PeriodOption {
  id: string;
  name: string;
  isActive: boolean;
}

export function CreateClassPanel({
  courses,
  periods,
}: {
  courses: CourseOption[];
  periods: PeriodOption[];
}) {
  const [open, setOpen] = useState(false);
  const ready = courses.length > 0 && periods.length > 0;

  return (
    <div className="flex flex-col gap-4 border-b border-border pb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {ready
            ? "Buat kelas dari mata kuliah yang tersedia di organisasi Anda."
            : "Mata kuliah atau periode akademik belum tersedia. Hubungi admin."}
        </p>
        {ready ? (
          <Button
            type="button"
            size="sm"
            variant={open ? "outline" : "primary"}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? "Batal" : "+ Buat kelas"}
          </Button>
        ) : null}
      </div>

      {open ? <CreateClassForm courses={courses} periods={periods} /> : null}
    </div>
  );
}

export function CreateClassForm({
  courses,
  periods,
}: {
  courses: CourseOption[];
  periods: PeriodOption[];
}) {
  const activePeriod = periods.find((period) => period.isActive) ?? periods[0];
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [code, setCode] = useState("");

  const courseName = courses.find((course) => course.id === courseId)?.name;

  return (
    <ActionForm action={createLecturerClassAction} submitLabel="Buat kelas">
      {(state) => (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="flex flex-col gap-2 md:col-span-2">
              <Label htmlFor="class-course">Mata kuliah</Label>
              <select
                id="class-course"
                name="courseId"
                value={courseId}
                onChange={(event) => setCourseId(event.target.value)}
                className={selectClass}
              >
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.code} · {course.name}
                  </option>
                ))}
              </select>
              <FieldError messages={state.fieldErrors?.["courseId"]} />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="class-code">Kelas</Label>
              <Input
                id="class-code"
                name="code"
                required
                maxLength={16}
                placeholder="A"
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
              <FieldError messages={state.fieldErrors?.["code"]} />
            </div>

            <div className="flex flex-col gap-2 md:col-span-2">
              <Label htmlFor="class-period">Periode akademik</Label>
              <select
                id="class-period"
                name="academicPeriodId"
                defaultValue={activePeriod?.id ?? ""}
                className={selectClass}
              >
                {periods.map((period) => (
                  <option key={period.id} value={period.id}>
                    {period.name}
                    {period.isActive ? " (berjalan)" : ""}
                  </option>
                ))}
              </select>
              <FieldError messages={state.fieldErrors?.["academicPeriodId"]} />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="class-capacity">Kapasitas (opsional)</Label>
              <Input
                id="class-capacity"
                name="capacity"
                type="number"
                min={1}
                max={500}
              />
              <FieldError messages={state.fieldErrors?.["capacity"]} />
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Kelas akan bernama{" "}
            <span className="text-foreground">
              {courseName ?? "—"} {code.trim() || "…"}
            </span>{" "}
            dan Anda langsung tercatat sebagai pengampunya.
          </p>
        </div>
      )}
    </ActionForm>
  );
}
