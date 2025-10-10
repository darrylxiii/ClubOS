import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0 active:scale-98 min-h-[48px]",
  {
    variants: {
      variant: {
        default: "glass text-foreground hover:bg-card/80 hover:scale-[1.02]",
        destructive: "glass bg-destructive/20 text-destructive hover:bg-destructive/30 border-destructive/40",
        outline: "glass border-border/60 hover:border-border/80",
        secondary: "glass bg-secondary/50 text-secondary-foreground hover:bg-secondary/70",
        ghost: "hover:bg-accent/10 hover:text-accent-foreground rounded-[var(--radius)]",
        link: "text-primary underline-offset-4 hover:underline min-h-auto",
        glass: "glass hover:bg-card/90",
        gradient: "glass bg-gradient-accent text-accent-foreground hover:opacity-95 border-accent/30",
      },
      size: {
        default: "h-12 px-6 py-3 rounded-[var(--radius)]",
        sm: "h-10 px-4 py-2 rounded-[calc(var(--radius)*0.8)] text-xs",
        lg: "h-14 px-8 py-4 rounded-[var(--radius)] text-base",
        icon: "h-12 w-12 rounded-[var(--radius)]",
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
