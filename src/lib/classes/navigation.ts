/** @format */

/**
 * Navigasi kelas dipisahkan dari komponennya supaya dapat diuji tanpa
 * merender apa pun, dan supaya kedua peran tidak diam-diam berbeda urutan.
 */

export interface ClassNavItem {
  label: string;
  href: string;
  /** Tujuan yang belum dibangun tetap terlihat, tetapi tidak dapat ditekan. */
  available: boolean;
}

export function lecturerClassNav(classId: string): ClassNavItem[] {
  const base = `/app/lecturer/classes/${classId}`;

  return [
    { label: "Ringkasan", href: base, available: true },
    { label: "Materi", href: `${base}/materials`, available: true },
    { label: "Pertemuan", href: `${base}/meetings`, available: true },
    { label: "PT-AI", href: `${base}/builder`, available: true },
    { label: "Mahasiswa", href: `${base}/students`, available: true },
    { label: "Review", href: "/app/lecturer/review", available: true },
    { label: "Progres", href: `${base}/analytics`, available: true },
  ];
}

export function studentClassNav(classId: string): ClassNavItem[] {
  const base = `/app/student/classes/${classId}`;

  return [
    { label: "Ringkasan", href: base, available: true },
    { label: "Materi", href: `${base}/materials`, available: true },
    { label: "Pertemuan", href: `${base}/meetings`, available: true },
    { label: "PT-AI", href: `${base}/ptai`, available: true },
    { label: "Portofolio", href: `${base}/portfolio`, available: true },
    { label: "Progres", href: "/app/student/progress", available: true },
  ];
}

/**
 * Tautan induk selalu cocok dengan turunannya, sehingga "Materi" tetap
 * tersorot saat mahasiswa membaca satu bahan. Ringkasan dikecualikan karena
 * jalurnya menjadi awalan seluruh tautan lain.
 */
export function isActiveClassNav(
  item: ClassNavItem,
  pathname: string,
  overviewHref: string,
): boolean {
  if (item.href === overviewHref) return pathname === overviewHref;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
