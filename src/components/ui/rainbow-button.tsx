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
        "group relative inline-flex h-11 cursor-pointer items-center justify-center rounded-xl px-8 py-2 font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        
        // Background matching theme
        "bg-background text-foreground",

        // Animated rotating gradient border
        "before:absolute before:inset-0 before:-z-10 before:rounded-xl before:p-[2px] before:animate-[spin_8s_linear_infinite]",
        "before:bg-[conic-gradient(from_0deg,hsl(var(--color-1)),hsl(var(--color-2)),hsl(var(--color-3)),hsl(var(--color-4)),hsl(var(--color-5)),hsl(var(--color-1)))]",
        
        // Glow effect that rotates with border
        "after:absolute after:inset-0 after:-z-20 after:rounded-xl after:blur-xl after:opacity-60 after:animate-[spin_8s_linear_infinite]",
        "after:bg-[conic-gradient(from_0deg,hsl(var(--color-1)),hsl(var(--color-2)),hsl(var(--color-3)),hsl(var(--color-4)),hsl(var(--color-5)),hsl(var(--color-1)))]",
        
        // Inner background to create border effect
        "relative z-10",
        "[&>*]:relative [&>*]:z-10",

        className,
      )}
      {...props}
    >
      <span className="absolute inset-[2px] rounded-[10px] bg-background z-0" />
      <span className="relative z-10">{children}</span>
    </button>
  );
}
