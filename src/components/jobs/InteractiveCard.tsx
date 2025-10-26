import { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface InteractiveCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  delay?: number;
  hover?: boolean;
}

export function InteractiveCard({ 
  children, 
  className, 
  onClick,
  delay = 0,
  hover = true 
}: InteractiveCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.5, delay }}
      whileHover={hover ? { 
        y: -4, 
        boxShadow: "0 20px 40px -10px hsl(var(--primary) / 0.2)" 
      } : undefined}
      onClick={onClick}
      className={cn(
        "glass-card p-6 rounded-xl border border-border/50 backdrop-blur-xl",
        "transition-all duration-300 cursor-default",
        onClick && "cursor-pointer",
        className
      )}
    >
      {children}
    </motion.div>
  );
}
