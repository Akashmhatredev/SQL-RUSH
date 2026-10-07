import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 select-none items-center justify-center gap-2 font-bold whitespace-nowrap transition-all duration-150 outline-none active:scale-[0.97] focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // Violet clay call to action
        primary:
          "bg-[linear-gradient(145deg,#8a6dff,#6a4cf5_55%,#5b3ee6)] text-white shadow-clay-btn hover:-translate-y-0.5 hover:brightness-105 active:translate-y-px active:shadow-clay-pressed",
        // Raised clay button
        secondary:
          "clay text-ink-800 shadow-clay-sm hover:-translate-y-0.5 hover:bg-white active:translate-y-px active:shadow-clay-pressed",
        outline:
          "border-2 border-ink-200 bg-transparent text-ink-800 hover:border-ink-300 hover:bg-white/60 active:shadow-clay-pressed",
        ghost: "text-ink-600 hover:bg-white/70 hover:text-ink-900 active:shadow-clay-pressed",
        danger: "bg-rose-100 text-rose-700 shadow-clay-sm hover:bg-rose-200 active:shadow-clay-pressed",
        success:
          "bg-[linear-gradient(145deg,#5ee9a8,#10b981)] text-ink-950 shadow-clay-btn hover:-translate-y-0.5 hover:brightness-105 active:translate-y-px active:shadow-clay-pressed",
        link: "text-violet-700 underline-offset-4 hover:underline",
      },
      size: {
        xs: "h-7 gap-1 rounded-lg px-2 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 gap-1.5 rounded-xl px-3.5 text-sm",
        md: "h-11 rounded-2xl px-5 text-sm",
        lg: "h-14 gap-2.5 rounded-3xl px-8 text-base",
        icon: "size-10 rounded-2xl",
        "icon-sm": "size-8 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size: "md",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  type = "button",
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      type={asChild ? undefined : type}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
