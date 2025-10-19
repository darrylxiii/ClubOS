import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown, ChevronRight, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

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
  defaultOpen = true,
}: NavigationGroupProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const location = useLocation();

  const hasActiveItem = items.some((item) => location.pathname === item.path);

  return (
    <div className="space-y-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between px-4 py-2 rounded-lg font-medium transition-all backdrop-blur-[var(--blur-glass-subtle)]",
          hasActiveItem
            ? "bg-card/50 border border-border/30 text-primary shadow-[var(--shadow-glass-sm)]"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <div className="flex items-center gap-3">
          <GroupIcon className="h-4 w-4" />
          <span className="text-sm font-bold uppercase tracking-wider">{title}</span>
        </div>
        {isOpen ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </button>

      {isOpen && (
        <div className="ml-4 space-y-1">
          {items.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-2 rounded-lg font-medium transition-all",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="text-sm">{item.name}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};
