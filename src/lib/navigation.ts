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
}

export interface NavSection {
  title?: string | undefined;
  items: NavItem[];
}

export const STUDENT_NAV: NavSection[] = [
  {
    title: "Belajar",
    items: [
      { label: "Dashboard", href: "/app/student/dashboard", icon: "dashboard" },
      { label: "Kelas saya", href: "/app/student/classes", icon: "classes" },
      { label: "Progres", href: "/app/student/progress", icon: "analytics" },
      {
        label: "Persetujuan penelitian",
        href: "/app/student/consent",
        icon: "settings",
      },
      { label: "Panduan", href: "/app/student/guide", icon: "guide" },
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
      },
      { label: "Kelas", href: "/app/lecturer/classes", icon: "classes" },
      { label: "Sumber", href: "/app/lecturer/sources", icon: "sources" },
      { label: "Rubrik", href: "/app/lecturer/rubrics", icon: "settings" },
      { label: "Review", href: "/app/lecturer/review", icon: "review" },
      {
        label: "Laporan AI",
        href: "/app/lecturer/incidents",
        icon: "incidents",
      },
      { label: "Panduan", href: "/app/lecturer/guide", icon: "guide" },
    ],
  },
];

export const ADMIN_NAV: NavSection[] = [
  {
    title: "Administrasi",
    items: [
      { label: "Dashboard", href: "/app/admin/dashboard", icon: "dashboard" },
      { label: "Pengguna", href: "/app/admin/users", icon: "users" },
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
      },
      { label: "Mata kuliah", href: "/app/admin/courses", icon: "learning" },
      { label: "Kelas", href: "/app/admin/classes", icon: "classes" },
    ],
  },
];
