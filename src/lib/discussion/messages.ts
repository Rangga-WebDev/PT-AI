/** @format */

export const MESSAGE_MAX_LENGTH = 2000;

export interface ClassMessageView {
  id: string;
  classId: string;
  moduleId: string | null;
  authorId: string;
  authorName: string;
  authorRole: "lecturer" | "student";
  body: string;
  deleted: boolean;
  createdAt: string;
}

export interface ClassMessageRow {
  id: string;
  class_id: string;
  module_id: string | null;
  author_id: string;
  author_name: string;
  author_role: string;
  body: string;
  deleted_at: string | null;
  created_at: string;
}

export const CLASS_MESSAGE_COLUMNS =
  "id, class_id, module_id, author_id, author_name, author_role, body, deleted_at, created_at";

/** Dipakai untuk baris dari server maupun dari peristiwa realtime. */
export function toClassMessageView(row: ClassMessageRow): ClassMessageView {
  return {
    id: row.id,
    classId: row.class_id,
    moduleId: row.module_id,
    authorId: row.author_id,
    authorName: row.author_name,
    authorRole: row.author_role === "lecturer" ? "lecturer" : "student",
    body: row.deleted_at ? "" : row.body,
    deleted: row.deleted_at !== null,
    createdAt: row.created_at,
  };
}

/** Pesan yang sama dapat tiba dua kali: dari aksi kirim dan dari realtime. */
export function mergeMessage(
  list: ClassMessageView[],
  message: ClassMessageView,
): ClassMessageView[] {
  const index = list.findIndex((item) => item.id === message.id);
  if (index >= 0) {
    const next = list.slice();
    next[index] = message;
    return next;
  }
  return [...list, message].sort(
    (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
  );
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

// WITA tanpa musim panas; offset tetap membuat server dan peramban sepakat.
const WITA_OFFSET_MS = 8 * 60 * 60 * 1000;

export function formatMessageTime(iso: string): string {
  const local = new Date(Date.parse(iso) + WITA_OFFSET_MS);
  const hours = String(local.getUTCHours()).padStart(2, "0");
  const minutes = String(local.getUTCMinutes()).padStart(2, "0");
  return `${local.getUTCDate()} ${MONTHS[local.getUTCMonth()]}, ${hours}.${minutes}`;
}
