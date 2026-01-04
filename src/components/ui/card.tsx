import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const cardVariants = cva(
  "rounded-2xl border text-card-foreground transition-all duration-300",
  {
    variants: {
      variant: {
        default: [
          "border-border/20 bg-card/30 backdrop-blur-[var(--blur-glass)]",
          "shadow-[var(--shadow-glass-md)] hover:shadow-[var(--shadow-glass-lg)]",
          "hover:border-border/40 hover:bg-card/40",
        ],
        static: [
          "border-border/20 bg-card/30 backdrop-blur-[var(--blur-glass)]",
          "shadow-[var(--shadow-glass-sm)]",
        ],
        elevated: [
          "border-border/30 bg-card/50 backdrop-blur-[var(--blur-glass-strong)]",
          "shadow-[var(--shadow-glass-lg)]",
        ],
        interactive: [
          "border-border/20 bg-card/30 backdrop-blur-[var(--blur-glass)]",
          "shadow-[var(--shadow-glass-md)] hover:shadow-[var(--shadow-glass-lg)]",
          "hover:border-border/40 hover:bg-card/40",
          "cursor-pointer hover:scale-[1.01] active:scale-[0.99]",
        ],
        outline: [
          "border-border/30 bg-transparent",
        ],
        ghost: [
          "border-transparent bg-transparent",
        ],
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant }), className)}
      {...props}
    />
  )
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-2 p-6", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-lg font-semibold leading-tight tracking-tight", className)} {...props} />
  ),
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
  ),
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />,
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
  ),
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, cardVariants };
