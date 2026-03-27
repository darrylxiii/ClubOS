import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const cardVariants = cva(
  "rounded-[2rem] border text-card-foreground transition-all duration-500 relative overflow-hidden",
  {
    variants: {
      variant: {
        default: [
          "border-[0.5px] border-white/10 dark:border-white/5 bg-white/[0.02] dark:bg-black/40 backdrop-blur-3xl",
          "shadow-[0_8px_32px_rgba(0,0,0,0.12)] shadow-black/20",
          "hover:border-white/20 hover:bg-white/[0.04] dark:hover:bg-black/50 hover:shadow-black/30",
          "after:absolute after:inset-0 after:rounded-[inherit] after:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] after:pointer-events-none z-0"
        ],
        static: [
          "border-[0.5px] border-white/5 dark:border-white/10 bg-black/20 backdrop-blur-xl",
          "shadow-sm",
        ],
        elevated: [
          "border-[0.5px] border-white/10 dark:border-white/20 bg-white/[0.05] dark:bg-black/60 backdrop-blur-3xl",
          "shadow-[0_16px_48px_-8px_rgba(0,0,0,0.5)] shadow-primary/20",
          "after:absolute after:inset-0 after:rounded-[inherit] after:shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] after:pointer-events-none z-0"
        ],
        interactive: [
          "border-[0.5px] border-white/10 dark:border-white/5 bg-white/[0.02] dark:bg-black/40 backdrop-blur-3xl",
          "shadow-xl shadow-black/10 hover:shadow-2xl hover:shadow-primary/20",
          "hover:border-primary/30 hover:bg-primary/5",
          "cursor-pointer hover:scale-[1.02] active:scale-[0.98] hover:-translate-y-1 transition-spring",
          "after:absolute after:inset-0 after:rounded-[inherit] after:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] after:pointer-events-none z-0"
        ],
        outline: [
          "border-border/30 bg-transparent rounded-2xl",
        ],
        ghost: [
          "border-transparent bg-transparent rounded-2xl",
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
    <div ref={ref} className={cn("flex flex-col space-y-2 p-8 relative z-10", className)} {...props} />
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
  ({ className, ...props }, ref) => <div ref={ref} className={cn("p-8 pt-0 relative z-10", className)} {...props} />,
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-8 pt-0 relative z-10", className)} {...props} />
  ),
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, cardVariants };
