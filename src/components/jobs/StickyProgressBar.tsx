import { motion } from "framer-motion";
import { useScrollTrigger } from "@/hooks/useScrollTrigger";
import { cn } from "@/lib/utils";

interface StickyProgressBarProps {
  sections: { id: string; label: string }[];
  activeSection?: string;
  onSectionClick: (id: string) => void;
}

export function StickyProgressBar({ sections, activeSection, onSectionClick }: StickyProgressBarProps) {
  const { scrollY, scrollDirection, isScrolled } = useScrollTrigger();
  
  // Calculate scroll progress (0-100)
  const scrollProgress = Math.min(
    100,
    (scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
  );

  return (
    <motion.div
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-transform duration-300",
        scrollDirection === 'down' && scrollY > 200 && "-translate-y-full",
        scrollDirection === 'up' && "translate-y-0"
      )}
      initial={{ y: -100 }}
      animate={{ y: isScrolled ? 0 : -100 }}
    >
      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-muted">
        <motion.div
          className="h-full bg-gradient-to-r from-primary via-accent to-chart-2"
          style={{ width: `${scrollProgress}%` }}
          initial={{ width: 0 }}
        />
      </div>

      {/* Navigation */}
      <div className="bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-2">
            {sections.map((section) => (
              <motion.button
                key={section.id}
                onClick={() => onSectionClick(section.id)}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap",
                  "hover:bg-muted/50",
                  activeSection === section.id
                    ? "text-accent bg-accent/10"
                    : "text-muted-foreground"
                )}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {section.label}
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
