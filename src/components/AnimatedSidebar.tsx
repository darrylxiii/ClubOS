import { useState, createContext, useContext, ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LucideIcon } from "lucide-react";

interface SidebarContextProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(undefined);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

interface SidebarProviderProps {
  children: ReactNode;
  open?: boolean;
  setOpen?: (open: boolean) => void;
}

export const SidebarProvider = ({ children, open: openProp, setOpen: setOpenProp }: SidebarProviderProps) => {
  const [openState, setOpenState] = useState(false);
  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

  return (
    <SidebarContext.Provider value={{ open, setOpen }}>
      {children}
    </SidebarContext.Provider>
  );
};

interface SidebarProps {
  children: ReactNode;
  className?: string;
  logoLight: string;
  logoDark: string;
}

export const Sidebar = ({ children, className, logoLight, logoDark }: SidebarProps) => {
  return (
    <SidebarProvider>
      <DesktopSidebar className={className} logoLight={logoLight} logoDark={logoDark}>
        {children}
      </DesktopSidebar>
      <MobileSidebar logoLight={logoLight} logoDark={logoDark}>
        {children}
      </MobileSidebar>
    </SidebarProvider>
  );
};

interface DesktopSidebarProps {
  children: ReactNode;
  className?: string;
  logoLight: string;
  logoDark: string;
}

const DesktopSidebar = ({ children, className, logoLight, logoDark }: DesktopSidebarProps) => {
  const { open, setOpen } = useSidebar();

  return (
    <motion.aside
      className={cn(
        "hidden md:flex flex-col fixed left-0 top-0 bottom-0 z-40",
        "bg-card/30 backdrop-blur-[var(--blur-glass)] border-r border-border/20",
        "shadow-[var(--shadow-glass-lg)]",
        className
      )}
      animate={{
        width: open ? "300px" : "80px",
      }}
      transition={{
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1],
      }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-center px-4 border-b border-border/20">
        <motion.div
          animate={{
            scale: open ? 1 : 0.8,
          }}
          transition={{ duration: 0.2 }}
        >
          <img
            src={logoDark}
            alt="Quantum Club"
            className={cn(
              "dark:block hidden transition-all",
              open ? "h-9" : "h-8"
            )}
          />
          <img
            src={logoLight}
            alt="Quantum Club"
            className={cn(
              "dark:hidden block transition-all",
              open ? "h-9" : "h-8"
            )}
          />
        </motion.div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide py-4">
        {children}
      </div>
    </motion.aside>
  );
};

interface MobileSidebarProps {
  children: ReactNode;
  logoLight: string;
  logoDark: string;
}

const MobileSidebar = ({ children, logoLight, logoDark }: MobileSidebarProps) => {
  const { open, setOpen } = useSidebar();

  return (
    <>
      {/* Mobile Header */}
      <div className="h-16 px-4 flex md:hidden items-center justify-between bg-card/30 backdrop-blur-[var(--blur-glass)] border-b border-border/20 fixed top-0 left-0 right-0 z-50">
        <img
          src={logoDark}
          alt="Quantum Club"
          className="h-9 dark:block hidden"
        />
        <img
          src={logoLight}
          alt="Quantum Club"
          className="h-9 dark:hidden block"
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen(!open)}
          className="z-50"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100] md:hidden"
              onClick={() => setOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{
                duration: 0.3,
                ease: [0.4, 0, 0.2, 1],
              }}
              className="fixed left-0 top-0 bottom-0 w-80 bg-card/95 backdrop-blur-[var(--blur-glass-strong)] border-r border-border/20 z-[101] md:hidden flex flex-col shadow-[var(--shadow-glass-xl)]"
            >
              <div className="h-16 flex items-center justify-between px-4 border-b border-border/20">
                <img
                  src={logoDark}
                  alt="Quantum Club"
                  className="h-9 dark:block hidden"
                />
                <img
                  src={logoLight}
                  alt="Quantum Club"
                  className="h-9 dark:hidden block"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setOpen(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto py-4">
                {children}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

interface NavigationItem {
  name: string;
  icon: LucideIcon;
  path: string;
}

interface SidebarLinkProps {
  item: NavigationItem;
  className?: string;
}

export const SidebarLink = ({ item, className }: SidebarLinkProps) => {
  const { open } = useSidebar();
  const location = useLocation();
  const isActive = location.pathname === item.path;

  return (
    <Link
      to={item.path}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
        "hover:bg-primary/10 hover:shadow-[var(--shadow-glass-sm)]",
        isActive && "bg-primary/15 shadow-[var(--shadow-glass-sm)] border border-primary/20",
        className
      )}
    >
      <item.icon
        className={cn(
          "h-5 w-5 flex-shrink-0 transition-colors",
          isActive ? "text-primary" : "text-muted-foreground"
        )}
      />
      <motion.span
        animate={{
          opacity: open ? 1 : 0,
          display: open ? "block" : "none",
        }}
        transition={{ duration: 0.2 }}
        className={cn(
          "text-sm font-medium whitespace-nowrap",
          isActive ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {item.name}
      </motion.span>
    </Link>
  );
};

interface NavigationGroup {
  title: string;
  icon: LucideIcon;
  items: NavigationItem[];
}

interface SidebarGroupProps {
  group: NavigationGroup;
}

export const SidebarGroup = ({ group }: SidebarGroupProps) => {
  const { open } = useSidebar();
  const [groupOpen, setGroupOpen] = useState(true);
  const location = useLocation();
  const hasActiveItem = group.items.some(item => location.pathname === item.path);

  return (
    <div className="px-3 mb-4">
      <button
        onClick={() => setGroupOpen(!groupOpen)}
        className={cn(
          "flex items-center gap-3 w-full px-4 py-2 mb-2 rounded-lg",
          "hover:bg-muted/50 transition-colors",
          hasActiveItem && "text-primary"
        )}
      >
        <group.icon className="h-4 w-4 flex-shrink-0" />
        <motion.span
          animate={{
            opacity: open ? 1 : 0,
            display: open ? "flex" : "none",
          }}
          className="flex-1 text-left text-xs font-semibold uppercase tracking-wide"
        >
          {group.title}
        </motion.span>
        <motion.div
          animate={{
            opacity: open ? 1 : 0,
            display: open ? "block" : "none",
            rotate: groupOpen ? 0 : -90,
          }}
        >
          <ChevronDown className="h-3 w-3" />
        </motion.div>
      </button>
      <AnimatePresence>
        {groupOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-1 overflow-hidden"
          >
            {group.items.map((item) => (
              <SidebarLink key={item.path} item={item} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface SidebarFooterProps {
  userName: string;
  userInitial: string;
  userAvatarUrl: string | null;
  onSignOut: () => void;
  profilePath: string;
}

export const SidebarFooter = ({ userName, userInitial, userAvatarUrl, onSignOut, profilePath }: SidebarFooterProps) => {
  const { open } = useSidebar();

  return (
    <div className="flex-shrink-0 p-4 border-t border-border/20 bg-card/50 backdrop-blur-[var(--blur-glass)]">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="glass"
            className={cn(
              "w-full h-auto py-3 transition-all",
              open ? "justify-start gap-3 px-3" : "justify-center px-2"
            )}
          >
            <Avatar className="h-9 w-9 flex-shrink-0">
              <AvatarImage src={userAvatarUrl || ""} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {userInitial}
              </AvatarFallback>
            </Avatar>
            <motion.div
              animate={{
                opacity: open ? 1 : 0,
                display: open ? "block" : "none",
              }}
              className="flex-1 text-left"
            >
              <p className="text-sm font-medium">{userName}</p>
              <p className="text-xs text-muted-foreground">View profile</p>
            </motion.div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 bg-card/95 backdrop-blur-[var(--blur-glass)] border-border/20">
          <DropdownMenuItem asChild>
            <Link to={profilePath} className="cursor-pointer">
              <span>My Profile</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/settings" className="cursor-pointer">
              <span>Settings</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onSignOut}
            className="cursor-pointer text-destructive"
          >
            <span>Sign out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
