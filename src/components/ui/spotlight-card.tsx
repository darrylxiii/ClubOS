import { motion } from "framer-motion";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SpotlightCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={cn(
        "group relative overflow-hidden rounded-[2rem] bg-white/[0.02] dark:bg-black/40 backdrop-blur-3xl border-[0.5px] border-white/10 dark:border-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.12)] shadow-black/20",
        className
      )}
      // Hover push effect
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {/* Magic Rotating Ambient Border (sub-pixel glow) */}
      <div className="absolute inset-0 z-0 overflow-hidden rounded-[2rem] pointer-events-none opacity-0 group-hover:opacity-20 transition-opacity duration-1000">
         <div className="absolute inset-[-100%] animate-[spin_8s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,rgba(var(--primary-rgb),0)_0%,rgba(var(--primary-rgb),0.5)_50%,rgba(var(--primary-rgb),0)_100%)]" />
      </div>

      {/* The Glass Top-Edge Highlight (Apple style) */}
      <div className="absolute inset-0 rounded-[2rem] shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] pointer-events-none z-0" />
      
      {/* Content wrapper */}
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </motion.div>
  );
}
