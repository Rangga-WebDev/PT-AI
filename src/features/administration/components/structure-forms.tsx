/** @format */

"use client";

import {
  createAcademicPeriodAction,
  createClassAction,
  createCourseAction,
  createFacultyAction,
  createStudyProgramAction,
} from "@/actions/academics/structure";
import {
  ActionForm,
  FieldError,
} from "@/features/administration/components/action-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Option {
  id: string;
  label: string;
}

const selectClass =
  "h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

export function CreateFacultyForm() {
  return (
    <ActionForm action={createFacultyAction} submitLabel="Tambah fakultas">
      {(state) => (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="faculty-name">Nama fakultas</Label>
            <Input id="faculty-name" name="name" required />
            <FieldError messages={state.fieldErrors?.["name"]} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="faculty-code">Kode</Label>
            <Input id="faculty-code" name="code" required />
            <FieldError messages={state.fieldErrors?.["code"]} />
          </div>
        </div>
      )}
    </ActionForm>
  );
}

export function CreateStudyProgramForm({ faculties }: { faculties: Option[] }) {
  return (
    <ActionForm
      action={createStudyProgramAction}
      submitLabel="Tambah program studi"
    >
      {(state) => (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="program-faculty">Fakultas</Label>
            <select
              id="program-faculty"
              name="facultyId"
              required
              className={selectClass}
            >
              {faculties.map((faculty) => (
                <option key={faculty.id} value={faculty.id}>
                  {faculty.label}
                </option>
              ))}
            </select>
            <FieldError messages={state.fieldErrors?.["facultyId"]} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="program-level">Jenjang</Label>
            <select
              id="program-level"
              name="degreeLevel"
              defaultValue="s1"
              className={selectClass}
            >
              <option value="d3">D3</option>
              <option value="s1">S1</option>
              <option value="s2">S2</option>
              <option value="s3">S3</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="program-name">Nama program studi</Label>
            <Input id="program-name" name="name" required />
            <FieldError messages={state.fieldErrors?.["name"]} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="program-code">Kode</Label>
            <Input id="program-code" name="code" required />
            <FieldError messages={state.fieldErrors?.["code"]} />
          </div>
        </div>
      )}
    </ActionForm>
  );
}

export function CreateAcademicPeriodForm() {
  return (
    <ActionForm
      action={createAcademicPeriodAction}
      submitLabel="Tambah periode"
    >
      {(state) => (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="period-name">Nama periode</Label>
            <Input
              id="period-name"
              name="name"
              placeholder="Ganjil 2026/2027"
              required
            />
            <FieldError messages={state.fieldErrors?.["name"]} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="period-code">Kode</Label>
            <Input id="period-code" name="code" placeholder="2026-1" required />
            <FieldError messages={state.fieldErrors?.["code"]} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="period-start">Tanggal mulai</Label>
            <Input id="period-start" name="startDate" type="date" required />
            <FieldError messages={state.fieldErrors?.["startDate"]} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="period-end">Tanggal selesai</Label>
            <Input id="period-end" name="endDate" type="date" required />
            <FieldError messages={state.fieldErrors?.["endDate"]} />
          </div>
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input type="checkbox" name="isActive" className="size-4" />
            Tandai sebagai periode aktif
          </label>
        </div>
      )}
    </ActionForm>
  );
}

export function CreateCourseForm({
  studyPrograms,
}: {
  studyPrograms: Option[];
}) {
  return (
    <ActionForm action={createCourseAction} submitLabel="Tambah mata kuliah">
      {(state) => (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="course-program">Program studi</Label>
            <select
              id="course-program"
              name="studyProgramId"
              required
              className={selectClass}
            >
              {studyPrograms.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.label}
                </option>
              ))}
            </select>
            <FieldError messages={state.fieldErrors?.["studyProgramId"]} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="course-credits">SKS</Label>
            <Input
              id="course-credits"
              name="credits"
              type="number"
              min={1}
              max={8}
              defaultValue={2}
              required
            />
            <FieldError messages={state.fieldErrors?.["credits"]} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="course-name">Nama mata kuliah</Label>
            <Input id="course-name" name="name" required />
            <FieldError messages={state.fieldErrors?.["name"]} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="course-code">Kode</Label>
            <Input id="course-code" name="code" required />
            <FieldError messages={state.fieldErrors?.["code"]} />
          </div>
        </div>
      )}
    </ActionForm>
  );
}

export function CreateClassForm({
  courses,
  periods,
}: {
  courses: Option[];
  periods: Option[];
}) {
  return (
    <ActionForm action={createClassAction} submitLabel="Buat kelas">
      {(state) => (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="class-course">Mata kuliah</Label>
            <select
              id="class-course"
              name="courseId"
              required
              className={selectClass}
            >
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.label}
                </option>
              ))}
            </select>
            <FieldError messages={state.fieldErrors?.["courseId"]} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="class-period">Periode akademik</Label>
            <select
              id="class-period"
              name="academicPeriodId"
              required
              className={selectClass}
            >
              {periods.map((period) => (
                <option key={period.id} value={period.id}>
                  {period.label}
                </option>
              ))}
            </select>
            <FieldError messages={state.fieldErrors?.["academicPeriodId"]} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="class-name">Nama kelas</Label>
            <Input id="class-name" name="name" required />
            <FieldError messages={state.fieldErrors?.["name"]} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="class-code">Kode kelas</Label>
            <Input id="class-code" name="code" placeholder="A" required />
            <FieldError messages={state.fieldErrors?.["code"]} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="class-capacity">Kapasitas (opsional)</Label>
            <Input id="class-capacity" name="capacity" type="number" min={1} />
            <FieldError messages={state.fieldErrors?.["capacity"]} />
          </div>
        </div>
      )}
    </ActionForm>
  );
}
