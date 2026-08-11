/** @format */

import { notFound } from "next/navigation";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/states/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  AssignLecturerForm,
  ClassStatusActions,
  EnrollStudentForm,
} from "@/features/administration/components/class-management";
import {
  getClassDetail,
  listClassMembers,
} from "@/server/repositories/classes";
import { listProfilesByRole } from "@/server/repositories/profiles";

const STATUS_LABEL = {
  draft: "Draf",
  published: "Terbit",
  archived: "Arsip",
} as const;

export default async function AdminClassDetailPage({
  params,
}: PageProps<"/app/admin/classes/[classId]">) {
  const { classId } = await params;
  const classItem = await getClassDetail(classId);

  if (!classItem) {
    notFound();
  }

  const [members, lecturers, students] = await Promise.all([
    listClassMembers(classId),
    listProfilesByRole("lecturer"),
    listProfilesByRole("student"),
  ]);

  const assignedLecturerIds = new Set(
    members.lecturers.map((item) => item.profileId),
  );
  const enrolledStudentIds = new Set(
    members.students.map((item) => item.profileId),
  );

  const availableLecturers = lecturers.filter(
    (lecturer) => !assignedLecturerIds.has(lecturer.id),
  );
  const availableStudents = students.filter(
    (student) => !enrolledStudentIds.has(student.id),
  );

  return (
    <PageContainer>
      <PageHeader
        eyebrow={`${classItem.code} · ${classItem.academicPeriod}`}
        title={classItem.name}
        description={classItem.courseName}
        actions={
          <StatusBadge
            status={classItem.status === "published" ? "published" : "draft"}
          >
            {STATUS_LABEL[classItem.status]}
          </StatusBadge>
        }
      />

      <div className="flex flex-col gap-8">
        <section
          aria-labelledby="status-kelas"
          className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5"
        >
          <h2 id="status-kelas" className="font-heading text-h4 font-semibold">
            Status publikasi
          </h2>
          <p className="text-sm text-muted-foreground">
            Mahasiswa hanya melihat kelas yang sudah diterbitkan.
          </p>
          <ClassStatusActions classId={classId} status={classItem.status} />
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section
            aria-labelledby="dosen-kelas"
            className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5"
          >
            <h2 id="dosen-kelas" className="font-heading text-h4 font-semibold">
              Dosen pengampu ({members.lecturers.length})
            </h2>
            {members.lecturers.length === 0 ? (
              <EmptyState description="Belum ada dosen yang ditugaskan." />
            ) : (
              <ul className="flex flex-col gap-2">
                {members.lecturers.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                  >
                    <span>{item.fullName}</span>
                    <span className="font-mono text-xs text-subtle">
                      {item.roleInClass === "coordinator"
                        ? "Koordinator"
                        : "Anggota"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {availableLecturers.length > 0 ? (
              <AssignLecturerForm
                classId={classId}
                lecturers={availableLecturers.map((lecturer) => ({
                  id: lecturer.id,
                  label: `${lecturer.fullName} (${lecturer.identifier})`,
                }))}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Semua dosen yang tersedia sudah ditugaskan.
              </p>
            )}
          </section>

          <section
            aria-labelledby="mahasiswa-kelas"
            className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5"
          >
            <h2
              id="mahasiswa-kelas"
              className="font-heading text-h4 font-semibold"
            >
              Mahasiswa terdaftar ({members.students.length})
            </h2>
            {members.students.length === 0 ? (
              <EmptyState description="Belum ada mahasiswa terdaftar." />
            ) : (
              <ul className="flex flex-col gap-2">
                {members.students.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                  >
                    <span>{item.fullName}</span>
                    <span className="font-mono text-xs text-subtle">
                      {item.identifier}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {availableStudents.length > 0 ? (
              <EnrollStudentForm
                classId={classId}
                students={availableStudents.map((student) => ({
                  id: student.id,
                  label: `${student.fullName} (${student.identifier})`,
                }))}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Semua mahasiswa yang tersedia sudah terdaftar.
              </p>
            )}
          </section>
        </div>
      </div>
    </PageContainer>
  );
}
