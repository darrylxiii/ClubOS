import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-border/30 bg-card/40 backdrop-blur-[var(--blur-glass-subtle)] text-foreground hover:bg-card/60 hover:border-border/50",
        secondary: "border-border/30 bg-card/30 backdrop-blur-[var(--blur-glass-subtle)] text-secondary-foreground hover:bg-card/50 hover:border-border/50",
        destructive: "border-destructive/30 bg-destructive/20 backdrop-blur-[var(--blur-glass-subtle)] text-destructive hover:bg-destructive/30 hover:border-destructive/50",
        outline: "border-border/30 text-foreground backdrop-blur-[var(--blur-glass-subtle)] hover:bg-card/20",
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
