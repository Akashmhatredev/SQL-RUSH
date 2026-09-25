import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 select-none items-center justify-center gap-2 font-semibold whitespace-nowrap transition-all duration-150 outline-none active:scale-[0.97] focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // Neon gradient call to action
        primary:
          "bg-gradient-to-r from-sky-400 via-cyan-400 to-violet-500 text-ink-950 shadow-[0_0_30px_-8px_rgba(60,201,255,0.8)] hover:shadow-[0_0_40px_-6px_rgba(168,85,247,0.9)] hover:brightness-110",
        // Glass card button
        secondary: "glass text-slate-100 hover:border-white/20 hover:bg-white/10",
        outline: "border border-white/15 bg-transparent text-slate-100 hover:border-white/30 hover:bg-white/5",
        ghost: "text-slate-300 hover:bg-white/5 hover:text-white",
        danger: "border border-rose-400/30 bg-rose-500/15 text-rose-200 hover:bg-rose-500/25",
        success: "bg-emerald-400 text-ink-950 shadow-[0_0_30px_-8px_rgba(52,211,153,0.9)] hover:brightness-110",
        link: "text-sky-300 underline-offset-4 hover:underline",
      },
      size: {
        xs: "h-7 gap-1 rounded-md px-2 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 gap-1.5 rounded-lg px-3 text-sm",
        md: "h-11 rounded-xl px-5 text-sm",
        lg: "h-14 gap-2.5 rounded-2xl px-8 text-base",
        icon: "size-10 rounded-xl",
        "icon-sm": "size-8 rounded-lg",
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
