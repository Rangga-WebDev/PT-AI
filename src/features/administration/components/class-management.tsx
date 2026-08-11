/** @format */

"use client";

import {
  assignLecturerAction,
  enrollStudentAction,
  updateClassStatusAction,
} from "@/actions/academics/structure";
import {
  ActionForm,
  InlineAction,
} from "@/features/administration/components/action-form";
import { Label } from "@/components/ui/label";

interface Option {
  id: string;
  label: string;
}

const selectClass =
  "h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

export function AssignLecturerForm({
  classId,
  lecturers,
}: {
  classId: string;
  lecturers: Option[];
}) {
  return (
    <ActionForm action={assignLecturerAction} submitLabel="Tugaskan dosen">
      {() => (
        <div className="flex flex-col gap-2">
          <input type="hidden" name="classId" value={classId} />
          <Label htmlFor="lecturerId">Pilih dosen</Label>
          <select
            id="lecturerId"
            name="lecturerId"
            required
            className={selectClass}
          >
            {lecturers.map((lecturer) => (
              <option key={lecturer.id} value={lecturer.id}>
                {lecturer.label}
              </option>
            ))}
          </select>
          <Label htmlFor="roleInClass">Peran di kelas</Label>
          <select
            id="roleInClass"
            name="roleInClass"
            defaultValue="member"
            className={selectClass}
          >
            <option value="coordinator">Koordinator</option>
            <option value="member">Anggota</option>
          </select>
        </div>
      )}
    </ActionForm>
  );
}

export function EnrollStudentForm({
  classId,
  students,
}: {
  classId: string;
  students: Option[];
}) {
  return (
    <ActionForm action={enrollStudentAction} submitLabel="Daftarkan mahasiswa">
      {() => (
        <div className="flex flex-col gap-2">
          <input type="hidden" name="classId" value={classId} />
          <Label htmlFor="studentId">Pilih mahasiswa</Label>
          <select
            id="studentId"
            name="studentId"
            required
            className={selectClass}
          >
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </ActionForm>
  );
}

export function ClassStatusActions({
  classId,
  status,
}: {
  classId: string;
  status: "draft" | "published" | "archived";
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {status !== "published" ? (
        <InlineAction
          action={updateClassStatusAction}
          label="Terbitkan kelas"
          fields={{ classId, status: "published" }}
        />
      ) : (
        <InlineAction
          action={updateClassStatusAction}
          label="Kembalikan ke draf"
          variant="ghost"
          fields={{ classId, status: "draft" }}
        />
      )}
      {status !== "archived" ? (
        <InlineAction
          action={updateClassStatusAction}
          label="Arsipkan"
          variant="ghost"
          fields={{ classId, status: "archived" }}
        />
      ) : null}
    </div>
  );
}
