import React from "react";

import { cn } from "@/lib/utils";

interface RainbowButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export function RainbowButton({
  children,
  className,
  ...props
}: RainbowButtonProps) {
  return (
    <button
      className={cn(
        "group relative inline-flex h-11 cursor-pointer items-center justify-center rounded-xl px-8 py-2 font-medium",
        "bg-background text-foreground",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        "disabled:pointer-events-none disabled:opacity-50",
        "overflow-hidden",
        
        // Rotating gradient border
        "before:absolute before:inset-0 before:rounded-xl before:p-[2px]",
        "before:bg-[conic-gradient(from_0deg,hsl(var(--color-1)),hsl(var(--color-5)),hsl(var(--color-3)),hsl(var(--color-4)),hsl(var(--color-2)),hsl(var(--color-1)))]",
        "before:animate-[spin_8s_linear_infinite]",
        "before:[mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)]",
        "before:[mask-composite:exclude]",
        
        // Glow effect
        "after:absolute after:inset-0 after:rounded-xl after:opacity-50",
        "after:bg-[conic-gradient(from_0deg,hsl(var(--color-1)),hsl(var(--color-5)),hsl(var(--color-3)),hsl(var(--color-4)),hsl(var(--color-2)),hsl(var(--color-1)))]",
        "after:animate-[spin_8s_linear_infinite]",
        "after:[filter:blur(20px)]",
        "after:-z-10",
        
        className,
      )}
      {...props}
    >
      <span className="relative z-10">{children}</span>
    </button>
  );
}
