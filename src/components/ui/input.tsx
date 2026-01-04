import * as React from "react";

import { cn } from "@/lib/utils";

export interface InputProps extends React.ComponentProps<"input"> {
  error?: boolean;
  success?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, success, ...props }, ref) => {
    return (
        <input
          type={type}
          className={cn(
            "flex h-11 min-h-[44px] w-full rounded-xl border-2 border-border/40 bg-background px-4 py-2.5 text-sm font-medium text-foreground",
            "transition-all duration-200 ease-out",
            "ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
            "placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:border-primary",
            "hover:border-primary/50",
            "disabled:cursor-not-allowed disabled:opacity-50",
            // Error state styling
            error && "border-destructive/60 focus-visible:ring-destructive focus-visible:border-destructive hover:border-destructive/80",
            // Success state styling
            success && "border-success/60 focus-visible:ring-success focus-visible:border-success hover:border-success/80",
            className,
          )}
          ref={ref}
          aria-invalid={error ? "true" : undefined}
          {...props}
        />
    );
  },
);
Input.displayName = "Input";

export { Input };
