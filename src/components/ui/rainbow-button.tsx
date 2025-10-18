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
        "group relative inline-flex h-11 cursor-pointer items-center justify-center rounded-xl px-8 py-2 font-bold text-white transition-all duration-300 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        // Brown gradient background matching Google aesthetic
        "bg-gradient-to-r from-[#8B4513] to-[#A0522D] hover:from-[#A0522D] hover:to-[#8B4513]",
        // Dark mode adjustments
        "dark:from-[#8B4513] dark:to-[#A0522D] dark:hover:from-[#A0522D] dark:hover:to-[#8B4513]",
        // Shadow for depth
        "shadow-lg shadow-[#8B4513]/20",
        className,
      )}
      {...props}
    >
      <span className="relative z-10 text-white font-bold">{children}</span>
    </button>
  );
}
