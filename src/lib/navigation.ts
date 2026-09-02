/** @format */

import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpen,
  FileCheck2,
  GraduationCap,
  Landmark,
  LayoutDashboard,
  LifeBuoy,
  Library,
  Settings,
  ShieldAlert,
  Users,
} from "lucide-react";

// Konfigurasi navigasi berbasis key ikon agar dapat diserialisasi dari
// Server Component ke Client Component (fungsi ikon tidak boleh melewati
// batas RSC).

export type NavIconKey =
  | "dashboard"
  | "classes"
  | "learning"
  | "sources"
  | "review"
  | "analytics"
  | "incidents"
  | "users"
  | "organization"
  | "guide"
  | "settings";

export const navIcons: Record<NavIconKey, LucideIcon> = {
  dashboard: LayoutDashboard,
  classes: GraduationCap,
  learning: BookOpen,
  sources: Library,
  review: FileCheck2,
  analytics: BarChart3,
  incidents: ShieldAlert,
  users: Users,
  organization: Landmark,
  guide: LifeBuoy,
  settings: Settings,
};

export interface NavItem {
  label: string;
  href: string;
  icon: NavIconKey;
  /** Label pendek untuk bilah bawah ponsel; dipakai bila label penuh terpotong. */
  shortLabel?: string;
  /** Hanya tujuan yang paling sering dibuka yang masuk bilah bawah ponsel. */
  onMobileBar?: boolean;
}

export interface NavSection {
  title?: string | undefined;
  items: NavItem[];
}

/** Bilah bawah ponsel memuat paling banyak empat tujuan. */
export function mobileBarItems(sections: NavSection[]): NavItem[] {
  const marked = sections
    .flatMap((section) => section.items)
    .filter((item) => item.onMobileBar);

  return (
    marked.length > 0 ? marked : sections.flatMap((section) => section.items)
  ).slice(0, 4);
}

export const STUDENT_NAV: NavSection[] = [
  {
    title: "Belajar",
    items: [
      {
        label: "Dashboard",
        href: "/app/student/dashboard",
        icon: "dashboard",
        onMobileBar: true,
      },
      {
        label: "Kelas saya",
        href: "/app/student/classes",
        icon: "classes",
        onMobileBar: true,
      },
      {
        label: "Progres",
        href: "/app/student/progress",
        icon: "analytics",
        onMobileBar: true,
      },
      {
        label: "Panduan",
        href: "/app/student/guide",
        icon: "guide",
        onMobileBar: true,
      },
    ],
  },
  {
    title: "Akun",
    items: [
      {
        label: "Persetujuan penelitian",
        href: "/app/student/consent",
        icon: "settings",
      },
    ],
  },
];

export const LECTURER_NAV: NavSection[] = [
  {
    title: "Pengajaran",
    items: [
      {
        label: "Dashboard",
        href: "/app/lecturer/dashboard",
        icon: "dashboard",
        onMobileBar: true,
      },
      {
        label: "Kelas",
        href: "/app/lecturer/classes",
        icon: "classes",
        onMobileBar: true,
      },
      {
        label: "Review",
        href: "/app/lecturer/review",
        icon: "review",
        onMobileBar: true,
      },
      {
        label: "Panduan",
        href: "/app/lecturer/guide",
        icon: "guide",
        onMobileBar: true,
      },
    ],
  },
  {
    title: "Perkakas",
    items: [
      { label: "Sumber", href: "/app/lecturer/sources", icon: "sources" },
      { label: "Rubrik", href: "/app/lecturer/rubrics", icon: "settings" },
      {
        label: "Laporan AI",
        href: "/app/lecturer/incidents",
        icon: "incidents",
      },
    ],
  },
];

export const ADMIN_NAV: NavSection[] = [
  {
    title: "Administrasi",
    items: [
      {
        label: "Dashboard",
        href: "/app/admin/dashboard",
        icon: "dashboard",
        onMobileBar: true,
      },
      {
        label: "Pengguna",
        href: "/app/admin/users",
        icon: "users",
        onMobileBar: true,
      },
      { label: "Retensi data", href: "/app/admin/retention", icon: "settings" },
    ],
  },
  {
    title: "Struktur akademik",
    items: [
      {
        label: "Organisasi",
        href: "/app/admin/organizations",
        icon: "organization",
      },
      {
        label: "Periode akademik",
        href: "/app/admin/academic-periods",
        icon: "settings",
        shortLabel: "Periode",
      },
      {
        label: "Mata kuliah",
        href: "/app/admin/courses",
        icon: "learning",
        shortLabel: "Mata kuliah",
        onMobileBar: true,
      },
      {
        label: "Kelas",
        href: "/app/admin/classes",
        icon: "classes",
        onMobileBar: true,
      },
    ],
  },
];
