import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[100px] w-full rounded-[12px] border-[0.5px] border-white/10 dark:border-white/5 bg-black/[0.03] dark:bg-black/20 backdrop-blur-xl px-4 py-3 text-sm font-medium text-foreground shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)] dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]",
        "transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] resize-none",
        "ring-offset-transparent placeholder:text-muted-foreground/40",
        "focus-visible:outline-none focus-visible:bg-black/[0.05] dark:focus-visible:bg-black/40 focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:border-white/20 focus-visible:shadow-[0_0_24px_rgba(255,255,255,0.05),inset_0_1px_1px_rgba(255,255,255,0.1)]",
        "hover:bg-black/[0.04] dark:hover:bg-black/30 hover:border-white/15",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
