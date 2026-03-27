import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border-[0.5px] px-2 py-[2px] text-[10px] uppercase tracking-[0.15em] font-bold transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 backdrop-blur-sm shadow-inner",
  {
    variants: {
      variant: {
        default: "border-foreground/20 bg-foreground/10 text-foreground hover:bg-foreground/20 hover:border-foreground/30 shadow-[inset_0_0_8px_rgba(255,255,255,0.05)]",
        secondary: "border-primary/20 bg-primary/10 text-primary-foreground hover:bg-primary/20 hover:border-primary/30",
        destructive: "border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20 hover:border-destructive/50 shadow-[inset_0_0_8px_rgba(239,68,68,0.1)]",
        outline: "border-white/10 text-foreground/80 hover:bg-white/5 hover:text-foreground",
        success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 hover:border-emerald-500/50 shadow-[inset_0_0_8px_rgba(16,185,129,0.1)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => {
    return <div ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />;
  }
);
Badge.displayName = "Badge";

export { Badge, badgeVariants };
