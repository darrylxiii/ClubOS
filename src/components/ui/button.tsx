import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-95",
  {
    variants: {
      variant: {
        default: "bg-card/70 backdrop-blur-[var(--blur-glass)] border border-border/50 hover:bg-card/90 shadow-glass-md hover:shadow-glass-lg text-foreground",
        outline: "border-2 border-border bg-card/30 backdrop-blur-[var(--blur-glass-subtle)] hover:bg-card/60 hover:border-foreground/20 shadow-glass-sm hover:shadow-glass-md text-foreground",
        secondary: "bg-muted/50 text-foreground hover:bg-muted/80 shadow-glass-sm hover:shadow-glass-md backdrop-blur-[var(--blur-glass-subtle)]",
        ghost: "hover:bg-accent/10 hover:text-foreground text-muted-foreground",
        link: "text-foreground underline-offset-4 hover:underline hover:text-foreground/80",
        glass: "bg-card/70 backdrop-blur-[var(--blur-glass)] border border-border/50 hover:bg-card/90 shadow-glass-md hover:shadow-glass-lg text-foreground",
      },
      size: {
        default: "h-11 px-6 py-2.5",
        sm: "h-9 rounded-lg px-4 text-xs",
        lg: "h-13 rounded-2xl px-8 text-base",
        icon: "h-11 w-11",
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
