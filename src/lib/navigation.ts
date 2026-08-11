/** @format */

import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpen,
  FileCheck2,
  GraduationCap,
  Landmark,
  LayoutDashboard,
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
      { label: "Rubrik", href: "/app/lecturer/rubrics", icon: "sources" },
      { label: "Review", href: "/app/lecturer/review", icon: "review" },
    ],
  },
];

export const ADMIN_NAV: NavSection[] = [
  {
    title: "Administrasi",
    items: [
      { label: "Dashboard", href: "/app/admin/dashboard", icon: "dashboard" },
      { label: "Pengguna", href: "/app/admin/users", icon: "users" },
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
