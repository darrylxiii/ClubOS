import { useRef, useEffect } from "react";
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
  const activeItemIndex = items.findIndex((item) => location.pathname === item.path);
  const hasActiveItem = activeItemIndex !== -1;
  const { isOpen, toggle } = useNavigationState(title, hasActiveItem);

  // Track previous visible items to detect which are new
  const prevVisibleItemsRef = useRef<NavigationItem[]>([]);
  
  // Track first mount to differentiate page load from user expansion
  const isFirstMountRef = useRef(true);

  const isActiveGroup = hasActiveItem;

  // Show items only if group has active item or user manually expanded
  // When collapsed: show only active item, when expanded: show all items
  const shouldShowItems = hasActiveItem || isOpen;
  const visibleItems = isOpen ? items : items.filter(item => location.pathname === item.path);

  // Update previous visible items after render and track first mount
  useEffect(() => {
    prevVisibleItemsRef.current = visibleItems;
    isFirstMountRef.current = false;
  }, [visibleItems]);

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
              "h-4 w-4 transition-colors duration-300",
              isActiveGroup && "text-primary"
            )} 
          />
          <span 
            className={cn(
              "text-sm uppercase tracking-wider transition-colors duration-300",
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

      <AnimatePresence initial={!isFirstMountRef.current} mode="popLayout">
        {shouldShowItems && (
          <motion.div
            layout="position"
            initial={isFirstMountRef.current ? false : { height: 0, opacity: 0 }}
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
            className="ml-4 space-y-1"
            style={{ overflow: "visible" }}
          >
            {visibleItems.map((item, index) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;

              // Detect if this item is new (wasn't in previous visible items)
              const wasVisible = prevVisibleItemsRef.current.some(
                (prevItem) => prevItem.path === item.path
              );
              const isNewItem = !wasVisible;

              // Calculate animation direction based on position relative to active item
              const distanceFromActive = Math.abs(index - activeItemIndex);
              const slideDirection = index < activeItemIndex ? -10 : 10; // Above: -10, Below: 10

              return (
                <motion.div
                  key={item.path}
                  initial={
                    wasVisible
                      ? false // Previously visible items don't re-animate
                      : { opacity: 0 }
                  }
                  animate={{ 
                    opacity: 1,
                    transition: { 
                      delay: isNewItem ? distanceFromActive * 0.04 : 0,
                      duration: 0.2,
                      ease: "easeOut"
                    }
                  }}
                  exit={{ opacity: 0 }}
                >
                  <Link
                    to={item.path}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2 rounded-lg transition-colors duration-200",
                      "hover:bg-muted/10",
                      isActive && "bg-muted/15 shadow-sm"
                    )}
                  >
                    <Icon 
                      className={cn(
                        "h-3.5 w-3.5 transition-colors duration-200",
                        isActive ? "text-primary" : "text-muted-foreground"
                      )} 
                    />
                    <span 
                      className={cn(
                        "text-sm transition-colors duration-200",
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
