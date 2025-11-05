import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-95",
  {
    variants: {
      variant: {
        default: "bg-card/40 backdrop-blur-[var(--blur-glass)] border border-border/40 hover:bg-card/60 hover:border-border/60 shadow-glass-md hover:shadow-glass-lg text-foreground transition-all",
        outline: "border border-border/30 bg-card/20 backdrop-blur-[var(--blur-glass-subtle)] hover:bg-card/40 hover:border-border/50 shadow-glass-sm hover:shadow-glass-md text-foreground transition-all",
        secondary: "bg-card/30 backdrop-blur-[var(--blur-glass-subtle)] border border-border/30 text-foreground hover:bg-card/50 hover:border-border/50 shadow-glass-sm hover:shadow-glass-md transition-all",
        ghost: "hover:bg-card/20 hover:text-foreground text-muted-foreground backdrop-blur-[var(--blur-glass-subtle)] transition-all",
        link: "text-foreground underline-offset-4 hover:underline hover:text-foreground/80",
        glass: "bg-card/30 backdrop-blur-[var(--blur-glass)] border border-border/40 hover:bg-card/50 hover:border-border/60 shadow-glass-md hover:shadow-glass-lg text-foreground transition-all",
      },
      size: {
        default: "h-11 px-6 py-2.5 min-h-[44px]",
        sm: "h-9 rounded-lg px-4 text-xs min-h-[36px]",
        lg: "h-13 rounded-2xl px-8 text-base min-h-[52px]",
        icon: "h-11 w-11 min-h-[44px] min-w-[44px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
