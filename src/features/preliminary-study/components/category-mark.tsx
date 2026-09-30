/** @format */

import { cn } from "@/lib/utils";

// Kategori penelitian bersifat ordinal (Rendah < Sedang < Tinggi), jadi
// dikodekan dengan satu warna pada tiga tingkat intensitas, bukan tiga warna
// yang seolah-olah setara. Label teks selalu menyertainya.
export const CATEGORY_TONE = [
  "bg-chart-5/35",
  "bg-chart-5/65",
  "bg-chart-5",
] as const;

export function CategoryMark({
  level,
  className,
}: {
  level: 0 | 1 | 2;
  className?: string | undefined;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block size-2 shrink-0 rounded-[2px]",
        CATEGORY_TONE[level],
        className,
      )}
    />
  );
}
