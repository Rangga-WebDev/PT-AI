/** @format */

import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// Button "Civic Intelligence" (LOCKED - requirement bagian 9):
// - primary : aqua, teks gelap, tinggi 44px, radius 12px, weight 600
// - ai      : tindakan berbantuan AI (violet tinted, border & teks violet)
// - outline : transparan dengan border terlihat
// - ghost   : aksi toolbar
// - danger  : tindakan destruktif (coral)
// Aturan: maksimal satu tombol primary pada satu card; tidak semua button pill.

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-transparent font-semibold whitespace-nowrap transition-colors outline-none select-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/30 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
        ai: "border-ai/45 bg-ai/12 text-ai hover:bg-ai/20 hover:text-ai-hover focus-visible:ring-ai/50",
        outline:
          "border-border bg-transparent text-foreground hover:bg-surface-active",
        ghost:
          "text-muted-foreground hover:bg-surface-active hover:text-foreground",
        danger:
          "bg-destructive text-destructive-foreground hover:bg-destructive/85 focus-visible:ring-destructive/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-6 text-base", // 44px (LOCKED)
        sm: "h-9 px-4 text-sm",
        lg: "h-12 px-7 text-base",
        icon: "size-11",
        "icon-sm": "size-9",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "primary",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      data-variant={variant}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
