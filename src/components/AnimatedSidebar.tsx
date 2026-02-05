import { useState, createContext, useContext, ReactNode, useCallback, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X, ChevronDown, Palette } from "lucide-react";
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
import { T } from "@/components/T";
import { useTranslation } from "react-i18next";
import { AppearanceSettingsModal } from "./appearance/AppearanceSettingsModal";

// ============================================================================
// Sidebar Context - Proper React state management (no window globals)
// ============================================================================

interface SidebarContextProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  isAnimating: boolean;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(undefined);

/**
 * Safe hook to access sidebar context
 * Returns default values instead of throwing when used outside provider
 */
export const useSidebar = (): SidebarContextProps => {
  const context = useContext(SidebarContext);
  if (!context) {
    // Return safe defaults instead of throwing
    console.warn("[Sidebar] useSidebar called outside SidebarProvider, using defaults");
    return {
      open: false,
      setOpen: () => {},
      toggle: () => {},
      isAnimating: false,
    };
  }
  return context;
};

/**
 * Safe hook that never throws - for components that might render before provider mounts
 */
export const useSidebarSafe = (): SidebarContextProps => {
  const context = useContext(SidebarContext);
  return context ?? {
    open: false,
    setOpen: () => {},
    toggle: () => {},
    isAnimating: false,
  };
};

interface SidebarProviderProps {
  children: ReactNode;
  open?: boolean;
  setOpen?: (open: boolean) => void;
  onOpenChange?: (open: boolean) => void;
}

export const SidebarProvider = ({ 
  children, 
  open: controlledOpen, 
  setOpen: controlledSetOpen,
  onOpenChange,
}: SidebarProviderProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Support both controlled and uncontrolled modes
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  
  const setOpen = useCallback((value: boolean) => {
    if (controlledSetOpen) {
      controlledSetOpen(value);
    } else {
      setInternalOpen(value);
    }
    onOpenChange?.(value);
  }, [controlledSetOpen, onOpenChange]);

  // Debounced toggle to prevent rapid-fire state changes
  const toggle = useCallback(() => {
    if (debounceRef.current) {
      return; // Ignore if debouncing
    }
    
    setIsAnimating(true);
    setOpen(!open);
    
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      setIsAnimating(false);
    }, 300);
  }, [open, setOpen]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <SidebarContext.Provider value={{ open, setOpen, toggle, isAnimating }}>
      {children}
    </SidebarContext.Provider>
  );
};

// ============================================================================
// Main Sidebar Component
// ============================================================================

interface SidebarProps {
  children: ReactNode;
  className?: string;
  logoLight: string;
  logoDark: string;
  logoLightShort: string;
  logoDarkShort: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  footer?: ReactNode;
}

export const Sidebar = ({ 
  children, 
  className, 
  logoLight, 
  logoDark, 
  logoLightShort, 
  logoDarkShort,
  open: controlledOpen,
  onOpenChange,
  footer,
}: SidebarProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  
  // Support controlled mode from parent
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = (value: boolean) => {
    setInternalOpen(value);
    onOpenChange?.(value);
  };

  return (
    <SidebarProvider open={open} setOpen={setOpen} onOpenChange={onOpenChange}>
      <DesktopSidebar 
        className={className} 
        logoLight={logoLight} 
        logoDark={logoDark} 
        logoLightShort={logoLightShort} 
        logoDarkShort={logoDarkShort}
        footer={footer}
      >
        {children}
      </DesktopSidebar>
      <MobileSidebar logoLight={logoLight} logoDark={logoDark} footer={footer}>
        {children}
      </MobileSidebar>
    </SidebarProvider>
  );
};

// ============================================================================
// Desktop Sidebar
// ============================================================================

interface DesktopSidebarProps {
  children: ReactNode;
  className?: string;
  logoLight: string;
  logoDark: string;
  logoLightShort: string;
  logoDarkShort: string;
  footer?: ReactNode;
}

const DesktopSidebar = ({ children, className, logoLight, logoDark, logoLightShort, logoDarkShort, footer }: DesktopSidebarProps) => {
  const { open, setOpen } = useSidebar();

  return (
    <motion.aside
      className={cn(
        "hidden md:flex flex-col fixed left-0 top-0 bottom-0 z-sidebar-desktop overflow-hidden",
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
      {/* Logo - matching header height for border alignment */}
      <div className="h-14 sm:h-16 flex items-center justify-center px-4 border-b border-border/20 relative z-header overflow-hidden">
        {/* Full logo - visible when expanded */}
        <motion.div
          className="absolute flex items-center justify-center"
          initial={false}
          animate={{
            opacity: open ? 1 : 0,
            scale: open ? 1 : 0.8,
            visibility: open ? "visible" : "hidden",
          }}
          transition={{
            duration: 0.25,
            delay: open ? 0.1 : 0,
            ease: [0.4, 0, 0.2, 1],
          }}
          style={{ pointerEvents: open ? "auto" : "none" }}
          aria-hidden={!open}
        >
          <img
            src={logoLightShort}
            alt="The Quantum Club"
            className="hidden dark:block h-24"
          />
          <img
            src={logoDarkShort}
            alt="The Quantum Club"
            className="dark:hidden block h-24"
          />
        </motion.div>

        {/* Small QC icon - visible when collapsed */}
        <motion.div
          className="absolute flex items-center justify-center"
          initial={false}
          animate={{
            opacity: open ? 0 : 1,
            scale: open ? 1.2 : 1,
            visibility: open ? "hidden" : "visible",
          }}
          transition={{
            duration: open ? 0.15 : 0.25,
            delay: open ? 0 : 0.1,
            ease: [0.4, 0, 0.2, 1],
          }}
          style={{ pointerEvents: open ? "none" : "auto" }}
          aria-hidden={open}
        >
          <img
            src={logoLight}
            alt="QC"
            className="hidden dark:block h-14"
          />
          <img
            src={logoDark}
            alt="QC"
            className="dark:hidden block h-14"
          />
        </motion.div>
      </div>

      {/* Scrollable Menu Content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide py-4 relative">
        <div className="pb-20">
          {children}
        </div>
      </div>

      {/* Fade gradient overlay - sits above scrollable content */}
      <div 
        className="absolute bottom-20 left-0 right-0 h-16 pointer-events-none z-10"
        style={{
          background: 'linear-gradient(to bottom, transparent 0%, hsl(var(--card) / 0.3) 30%, hsl(var(--card) / 0.95) 100%)'
        }}
      />

      {/* Fixed Footer - always visible at bottom */}
      {footer && (
        <div className="absolute bottom-0 left-0 right-0 z-20 bg-card/95 backdrop-blur-sm border-t border-border/10">
          {footer}
        </div>
      )}
    </motion.aside>
  );
};

// ============================================================================
// Mobile Sidebar
// ============================================================================

interface MobileSidebarProps {
  children: ReactNode;
  logoLight: string;
  logoDark: string;
  footer?: ReactNode;
}

const MobileSidebar = ({ children, logoLight, logoDark, footer }: MobileSidebarProps) => {
  const { open, setOpen, toggle, isAnimating } = useSidebar();

  return (
    <>
      {/* Mobile Header - Hidden (using AppLayout header instead) */}
      <div className="h-16 px-4 hidden items-center justify-between bg-card/30 backdrop-blur-[var(--blur-glass)] border-b border-border/20 fixed top-0 left-0 right-0 z-header">
        <img
          src={logoLight}
          alt="The Quantum Club"
          className="h-9 hidden dark:block"
        />
        <img
          src={logoDark}
          alt="The Quantum Club"
          className="h-9 dark:hidden block"
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          data-sidebar-toggle
          className="z-50 min-h-[44px] min-w-[44px]"
          disabled={isAnimating}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Mobile Overlay with proper z-index */}
      <AnimatePresence mode="wait" initial={false}>
        {open && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-sidebar-overlay md:hidden"
              onClick={toggle}
            />
            <motion.aside
              key="mobile-sidebar"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{
                duration: 0.3,
                ease: [0.4, 0, 0.2, 1],
              }}
              className="fixed left-0 top-0 bottom-0 w-80 bg-card/95 backdrop-blur-[var(--blur-glass-strong)] border-r border-border/20 z-sidebar-mobile md:hidden flex flex-col shadow-[var(--shadow-glass-xl)] relative"
            >
              <div className="h-16 flex items-center justify-between px-4 border-b border-border/20">
                <img
                  src={logoLight}
                  alt="The Quantum Club"
                  className="h-9 hidden dark:block"
                />
                <img
                  src={logoDark}
                  alt="The Quantum Club"
                  className="h-9 dark:hidden block"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setOpen(false)}
                  aria-label="Close sidebar"
                  disabled={isAnimating}
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto py-4 relative">
                <div className="pb-20">
                  {children}
                </div>
              </div>

              {/* Fade gradient overlay */}
              <div 
                className="absolute bottom-20 left-0 right-0 h-16 pointer-events-none z-10"
                style={{
                  background: 'linear-gradient(to bottom, transparent 0%, hsl(var(--card) / 0.3) 30%, hsl(var(--card) / 0.95) 100%)'
                }}
              />

              {/* Fixed Footer */}
              {footer && (
                <div className="absolute bottom-0 left-0 right-0 z-20 bg-card/95 backdrop-blur-sm border-t border-border/10">
                  {footer}
                </div>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

// ============================================================================
// Sidebar Link Component
// ============================================================================

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
        "flex items-center rounded-xl",
        open ? "gap-3 px-4" : "justify-center px-0",
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
            "whitespace-nowrap overflow-hidden text-ellipsis transition-colors duration-300",
            isActive ? "text-label-md font-bold text-foreground" : "text-label-md font-medium text-muted-foreground"
          )}
        >
          {item.name}
        </span>
      )}
    </Link>
  );
};

// ============================================================================
// Sidebar Group Component
// ============================================================================

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

  // Show items only if group has active item or user manually expanded
  // When collapsed: show only active item, when expanded: show all items
  const shouldShowItems = hasActiveItem || groupOpen;
  const visibleItems = groupOpen ? group.items : group.items.filter(item => location.pathname === item.path);

  return (
    <div className="px-3 mb-4">
      <button
        onClick={toggle}
        className={cn(
          "flex items-center gap-3 w-full px-4 rounded-lg",
          "min-h-[40px] h-[40px]",
          "transition-all duration-300 ease-out",
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
              "flex-1 text-left text-label-xs uppercase tracking-wide transition-all duration-300 whitespace-nowrap overflow-hidden text-ellipsis",
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
      <AnimatePresence initial={false} mode="wait">
        {shouldShowItems && (
          <motion.div
            key={`${group.title}-items`}
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
            {visibleItems.map((item, index) => (
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
                <SidebarLink item={item} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================================================
// Sidebar Footer Component
// ============================================================================

interface SidebarFooterProps {
  userName: string;
  userInitial: string;
  userAvatarUrl: string | null;
  onSignOut: () => void;
  profilePath: string;
}

export const SidebarFooter = ({ userName, userInitial, userAvatarUrl, onSignOut, profilePath }: SidebarFooterProps) => {
  const { open } = useSidebar();
  const [appearanceOpen, setAppearanceOpen] = useState(false);

  return (
    <>
      <div className="px-3 mb-4">
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "w-full flex items-center rounded-xl",
                open ? "gap-3 px-4" : "justify-center px-0",
                "min-h-[44px] h-[44px]",
                "transition-all duration-300 ease-in-out",
                "hover:bg-muted/10"
              )}
            >
              <Avatar className="h-9 w-9 flex-shrink-0">
                <AvatarImage src={userAvatarUrl || ""} />
                <AvatarFallback className="bg-muted text-foreground">
                  {userInitial}
                </AvatarFallback>
              </Avatar>
              {open && (
                <div className="flex-1 text-left overflow-hidden min-w-0">
                  <p className="text-label-md font-medium whitespace-nowrap overflow-hidden text-ellipsis">{userName}</p>
                  <p className="text-label-xs text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">View profile</p>
                </div>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-56 bg-card border-border z-modal"
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
              onClick={() => setAppearanceOpen(true)}
              className="cursor-pointer"
            >
              <Palette className="mr-2 h-4 w-4" />
              <span>Appearance</span>
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

      <AppearanceSettingsModal open={appearanceOpen} onOpenChange={setAppearanceOpen} />
    </>
  );
};
