import { useLocation, useNavigate } from "react-router-dom";
import { Home, Briefcase, MessageSquare, User, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";
import { useHaptics } from "@/hooks/useHaptics";

const NAV_ITEMS = [
  { icon: Home, label: "Home", path: "/home" },
  { icon: Briefcase, label: "Jobs", path: "/jobs" },
  { icon: MessageSquare, label: "Messages", path: "/messages" },
  { icon: User, label: "Profile", path: "/profile" },
  { icon: MoreHorizontal, label: "More", path: "/settings" },
] as const;

export const MobileBottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);
  const haptics = useHaptics();

  useEffect(() => {
    const main = document.getElementById("main-content");
    if (!main) return;

    const onScroll = () => {
      const y = main.scrollTop;
      setVisible(y <= 10 || y < lastScrollY.current);
      lastScrollY.current = y;
    };

    main.addEventListener("scroll", onScroll, { passive: true });
    return () => main.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-header md:hidden",
        "bg-card/90 border-t border-border/20 shadow-lg",
        "transition-transform duration-300",
        visible ? "translate-y-0" : "translate-y-full"
      )}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around h-14">
        {NAV_ITEMS.map(({ icon: Icon, label, path }) => {
          const isActive = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 w-16 h-full",
                "text-[10px] font-medium transition-colors",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground"
              )}
              aria-label={label}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className={cn("h-5 w-5", isActive && "text-foreground")} />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
