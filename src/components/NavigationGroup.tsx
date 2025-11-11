import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown, ChevronRight, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigationState } from "@/hooks/useNavigationState";

interface NavigationItem {
  name: string;
  icon: LucideIcon;
  path: string;
}

interface NavigationGroupProps {
  title: string;
  icon: LucideIcon;
  items: NavigationItem[];
  defaultOpen?: boolean;
}

export const NavigationGroup = ({
  title,
  icon: GroupIcon,
  items,
  defaultOpen = false,
}: NavigationGroupProps) => {
  const location = useLocation();
  const hasActiveItem = items.some((item) => location.pathname === item.path);
  const { isOpen, toggle } = useNavigationState(title, hasActiveItem);

  const isActiveGroup = hasActiveItem;

  // Show items only if group has active item or user manually expanded
  // When collapsed: show only active item, when expanded: show all items
  const shouldShowItems = hasActiveItem || isOpen;
  const visibleItems = isOpen ? items : items.filter(item => location.pathname === item.path);

  return (
    <div className="space-y-1">
      <button
        onClick={toggle}
        className={cn(
          "w-full flex items-center justify-between px-4 py-2 rounded-lg transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] backdrop-blur-[var(--blur-glass-subtle)]",
          "hover:bg-muted/50 hover:scale-[1.01]",
          // Enhanced visual feedback
          isOpen && isActiveGroup && "bg-card/50 border border-border/30 text-primary shadow-[var(--shadow-glass-sm)]",
          isOpen && !isActiveGroup && "bg-card/30 border border-border/20 text-foreground",
          !isOpen && isActiveGroup && "text-primary/80",
          !isOpen && !isActiveGroup && "text-muted-foreground hover:text-foreground"
        )}
      >
        <div className="flex items-center gap-3">
          <GroupIcon 
            className={cn(
              "h-4 w-4 transition-all duration-300",
              isActiveGroup && "text-primary scale-110"
            )} 
          />
          <span 
            className={cn(
              "text-sm uppercase tracking-wider transition-all duration-300",
              isOpen && isActiveGroup ? "font-bold" : "font-bold"
            )}
          >
            {title}
          </span>
        </div>
        {isOpen ? (
          <ChevronDown 
            className={cn(
              "h-4 w-4 transition-all duration-300",
              isActiveGroup && "text-primary"
            )} 
          />
        ) : (
          <ChevronRight 
            className={cn(
              "h-4 w-4 transition-all duration-300",
              isActiveGroup && "text-primary"
            )} 
          />
        )}
      </button>

      <AnimatePresence initial={false}>
        {shouldShowItems && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ 
              height: "auto", 
              opacity: 1,
              transition: {
                height: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
                opacity: { duration: 0.25, ease: "easeOut", delay: 0.05 }
              }
            }}
            exit={{ 
              height: 0, 
              opacity: 0,
              transition: {
                height: { duration: 0.25, ease: [0.4, 0, 0.2, 1] },
                opacity: { duration: 0.2, ease: "easeIn" }
              }
            }}
            className="ml-4 space-y-1 overflow-hidden"
          >
            {visibleItems.map((item, index) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;

              return (
                <motion.div
                  key={item.path}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ 
                    opacity: 1, 
                    x: 0,
                    transition: { 
                      delay: index * 0.05,
                      duration: 0.2,
                      ease: "easeOut"
                    }
                  }}
                  exit={{ opacity: 0, x: -10 }}
                >
                  <Link
                    to={item.path}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-300",
                      "hover:bg-muted/10 hover:scale-[1.01]",
                      isActive && "bg-muted/15 shadow-sm"
                    )}
                  >
                    <Icon 
                      className={cn(
                        "h-4 w-4 transition-all duration-300",
                        isActive ? "text-primary scale-110" : "text-muted-foreground"
                      )} 
                    />
                    <span 
                      className={cn(
                        "text-sm transition-colors duration-300",
                        isActive ? "text-foreground font-bold" : "text-muted-foreground font-medium"
                      )}
                    >
                      {item.name}
                    </span>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
