/** @format */

// MOCK — data contoh untuk prototipe visual PHASE 3.

import type { ClassSummary } from "@/types/learning";

export const MOCK_STUDENT_CLASSES: ClassSummary[] = [
  {
    id: "kelas-pkn-a",
    code: "PKN-2201-A",
    name: "Pendidikan Kewarganegaraan A",
    courseName: "Pendidikan Kewarganegaraan",
    lecturerName: "Dr. Bayu Kusuma",
    academicPeriod: "Ganjil 2026/2027",
    studentCount: 38,
    activeUnitTitle: "Partisipasi Warga dalam Konsultasi Publik",
    progressPercent: 42,
  },
  {
    id: "kelas-pkn-b",
    code: "PKN-2201-B",
    name: "Pendidikan Kewarganegaraan B",
    courseName: "Pendidikan Kewarganegaraan",
    lecturerName: "Dr. Bayu Kusuma",
    academicPeriod: "Ganjil 2026/2027",
    studentCount: 36,
    activeUnitTitle: "Literasi Informasi dan Misinformasi Pemilu",
    progressPercent: 12,
  },
];

export const MOCK_LECTURER_CLASSES: ClassSummary[] = [
  ...MOCK_STUDENT_CLASSES,
  {
    id: "kelas-pkn-c",
    code: "PKN-2201-C",
    name: "Pendidikan Kewarganegaraan C",
    courseName: "Pendidikan Kewarganegaraan",
    lecturerName: "Dr. Bayu Kusuma",
    academicPeriod: "Ganjil 2026/2027",
    studentCount: 34,
    activeUnitTitle: "Hak Warga atas Ruang Publik Kota",
    progressPercent: 0,
  },
];

export function findMockClass(classId: string): ClassSummary | undefined {
  return MOCK_LECTURER_CLASSES.find((item) => item.id === classId);
}
