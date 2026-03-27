import { useState, ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface DashboardSectionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

/**
 * Collapsible dashboard section - collapses on mobile, always open on desktop
 */
export function DashboardSection({ title, children, defaultOpen = true, className }: DashboardSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={cn("space-y-3", className)}>
      {/* Mobile-only collapse header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full md:hidden"
      >
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</h2>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* Desktop: always visible title */}
      <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground hidden md:block">{title}</h2>

      {/* Content: collapsible on mobile, always visible on desktop */}
      <div className="hidden md:block space-y-3">
        {children}
      </div>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden md:hidden space-y-3"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
