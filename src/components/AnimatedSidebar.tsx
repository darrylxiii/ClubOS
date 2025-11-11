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
import { useNavigationState } from "@/hooks/useNavigationState";

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
  logoLightShort: string;
  logoDarkShort: string;
}

export const Sidebar = ({ children, className, logoLight, logoDark, logoLightShort, logoDarkShort }: SidebarProps) => {
  return (
    <SidebarProvider>
      <DesktopSidebar className={className} logoLight={logoLight} logoDark={logoDark} logoLightShort={logoLightShort} logoDarkShort={logoDarkShort}>
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
  logoLightShort: string;
  logoDarkShort: string;
}

const DesktopSidebar = ({ children, className, logoLight, logoDark, logoLightShort, logoDarkShort }: DesktopSidebarProps) => {
  const { open, setOpen } = useSidebar();

  return (
    <motion.aside
      className={cn(
        "hidden md:flex flex-col fixed left-0 top-0 bottom-0 z-[95]",
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
      <div className="h-16 flex items-center justify-center px-4 border-b border-border/20 relative z-[100]">
        <AnimatePresence mode="wait">
          {open ? (
            <motion.div
              key="expanded"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
              className="flex items-center justify-center"
            >
              {/* Full "Quantum CLUB" text logo when EXPANDED (wide sidebar) */}
              <img
                src={logoLightShort}
                alt="The Quantum Club"
                className="hidden dark:block h-20"
              />
              <img
                src={logoDarkShort}
                alt="The Quantum Club"
                className="dark:hidden block h-20"
              />
            </motion.div>
          ) : (
            <motion.div
              key="collapsed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
              className="flex items-center justify-center"
            >
              {/* Small QC icon when COLLAPSED (slim sidebar) */}
              <img
                src={logoLight}
                alt="QC"
                className="hidden dark:block h-12"
              />
              <img
                src={logoDark}
                alt="QC"
                className="dark:hidden block h-12"
              />
            </motion.div>
          )}
        </AnimatePresence>
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
      <div className="h-16 px-4 flex md:hidden items-center justify-between bg-card/30 backdrop-blur-[var(--blur-glass)] border-b border-border/20 fixed top-0 left-0 right-0 z-[100]">
        <img
          src={logoDark}
          alt="The Quantum Club"
          className="h-9 dark:block hidden"
        />
        <img
          src={logoLight}
          alt="The Quantum Club"
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
                  alt="The Quantum Club"
                  className="h-9 dark:block hidden"
                />
                <img
                  src={logoLight}
                  alt="The Quantum Club"
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
        "flex items-center gap-3 px-4 rounded-xl",
        "min-h-[44px] h-[44px]", // Fixed height to prevent shifting
        "transition-all duration-300 ease-in-out",
        "border border-transparent",
        "hover:bg-muted/10 hover:scale-[1.02] hover:shadow-[var(--shadow-glass-sm)]",
        isActive && "bg-muted/15 shadow-[var(--shadow-glass-sm)] border-border/20",
        className
      )}
    >
      <item.icon
        className={cn(
          "h-5 w-5 flex-shrink-0 transition-all duration-300 ease-in-out",
          isActive ? "text-primary scale-110" : "text-muted-foreground",
          "group-hover:scale-110"
        )}
      />
      {open && (
        <span
          className={cn(
            "text-sm whitespace-nowrap overflow-hidden text-ellipsis transition-colors duration-300",
            isActive ? "text-foreground font-bold" : "text-muted-foreground font-medium"
          )}
        >
          {item.name}
        </span>
      )}
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
  const location = useLocation();
  const hasActiveItem = group.items.some(item => location.pathname === item.path);
  const { isOpen: groupOpen, toggle } = useNavigationState(group.title, hasActiveItem);

  // Determine visual state for enhanced feedback
  const isExpanded = groupOpen;
  const isActiveGroup = hasActiveItem;

  return (
    <div className="px-3 mb-4">
      <button
        onClick={toggle}
        className={cn(
          "flex items-center gap-3 w-full px-4 rounded-lg",
          "min-h-[40px] h-[40px]",
          "transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
          "hover:bg-muted/50 hover:scale-[1.01]",
          "mb-2",
          // Enhanced visual feedback for 4 states
          isExpanded && isActiveGroup && "bg-muted/20 text-primary shadow-sm",
          isExpanded && !isActiveGroup && "text-foreground",
          !isExpanded && isActiveGroup && "text-primary/80",
          !isExpanded && !isActiveGroup && "text-muted-foreground"
        )}
      >
        <group.icon 
          className={cn(
            "h-4 w-4 flex-shrink-0 transition-all duration-300",
            isActiveGroup && "text-primary scale-110"
          )} 
        />
        {open && (
          <span 
            className={cn(
              "flex-1 text-left text-xs uppercase tracking-wide transition-all duration-300 whitespace-nowrap overflow-hidden text-ellipsis",
              isExpanded && isActiveGroup ? "font-bold" : "font-semibold"
            )}
          >
            {group.title}
          </span>
        )}
        {open && (
          <ChevronDown 
            className={cn(
              "h-3 w-3 flex-shrink-0 transition-all duration-300",
              groupOpen ? "rotate-0" : "-rotate-90",
              isActiveGroup && "text-primary"
            )}
          />
        )}
      </button>
      <AnimatePresence initial={false}>
        {groupOpen && (
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
            className="space-y-1 overflow-hidden"
          >
            {group.items.map((item, index) => (
              <motion.div
                key={item.path}
                initial={{ opacity: 0, x: -10 }}
                animate={{ 
                  opacity: 1, 
                  x: 0,
                  transition: { 
                    delay: index * 0.05, // Staggered reveal
                    duration: 0.2,
                    ease: "easeOut"
                  }
                }}
                exit={{ opacity: 0, x: -10 }}
              >
                <SidebarLink item={item} />
              </motion.div>
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
    <div className="flex-shrink-0 p-4">
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              "w-full rounded-lg relative",
              "min-h-[52px] h-[52px]", // Fixed height
              "transition-all duration-300 ease-in-out",
              "hover:bg-muted/50 hover:scale-[1.02]",
              "px-3 py-3" // Consistent padding
            )}
          >
            <div className="flex items-center gap-3 w-full">
              <div className="flex-shrink-0">
                <Avatar className="h-9 w-9 transition-transform duration-300 hover:scale-110">
                  <AvatarImage src={userAvatarUrl || ""} />
                  <AvatarFallback className="bg-muted text-foreground">
                    {userInitial}
                  </AvatarFallback>
                </Avatar>
              </div>
              {open && (
                <div className="flex-1 text-left overflow-hidden min-w-0">
                  <p className="text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis">{userName}</p>
                  <p className="text-xs text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">View profile</p>
                </div>
              )}
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="end" 
          className="w-56 bg-card border-border z-[100]"
          sideOffset={5}
        >
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
