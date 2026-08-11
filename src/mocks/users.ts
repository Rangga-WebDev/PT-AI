/** @format */

// MOCK — data contoh untuk prototipe visual PHASE 3.
// Seluruh nama bersifat fiktif. Hapus folder ini saat fitur nyata terhubung
// ke database (lihat docs/PROGRESS.md).

import type { UserRole } from "@/types/learning";

export interface MockUser {
  id: string;
  fullName: string;
  identifier: string;
  role: UserRole;
  studyProgram: string;
  initials: string;
}

export const MOCK_STUDENT: MockUser = {
  id: "mock-student-1",
  fullName: "Anindita Rahmawati",
  identifier: "2210512001",
  role: "student",
  studyProgram: "Ilmu Komunikasi",
  initials: "AR",
};

export const MOCK_LECTURER: MockUser = {
  id: "mock-lecturer-1",
  fullName: "Dr. Bayu Kusuma",
  identifier: "0012098702",
  role: "lecturer",
  studyProgram: "Pendidikan Kewarganegaraan",
  initials: "BK",
};
