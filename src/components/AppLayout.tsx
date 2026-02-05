import { ReactNode, useState, useEffect, useMemo, lazy, Suspense, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useTranslationSync } from "@/hooks/use-translation-sync";
import { GlobalRunningTimerHeader } from "@/components/time-tracking/GlobalRunningTimerHeader";
// Short QC icons (for collapsed state) - "transparent" files are the small icons
import quantumClubLogoDarkShort from "@/assets/quantum-logo-dark-transparent.png"; // QC icon - black for light theme
import quantumClubLogoLightShort from "@/assets/quantum-logo-light-transparent.png"; // QC icon - white for dark theme
// Full logos (for expanded state) - these are the full text logos
import quantumClubLogoDark from "@/assets/quantum-club-logo.png"; // Full logo - black for light theme
import quantumClubLogoLight from "@/assets/quantum-logo-dark.png"; // Full logo - white for dark theme
import { supabase } from "@/integrations/supabase/client";
import { GlobalCallNotificationProvider } from "./GlobalCallNotificationProvider";
import { MeetingNotificationManager } from "./meetings/MeetingNotificationManager";
import { DynamicBackground } from "./DynamicBackground";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/NotificationBell";
import { MusicPlayer } from "@/components/MusicPlayer";
import { CommandPalette } from "@/components/CommandPalette";
// Lazy load ClubAIVoice to prevent livekit-client module resolution at startup
const ClubAIVoice = lazy(() => 
  import("@/components/voice/ClubAIVoice").then(m => ({ default: m.ClubAIVoice }))
);
import { GlobalRoleSwitcher } from "@/components/GlobalRoleSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MotionToggle } from "@/components/MotionToggle";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { BurgerMenu } from "@/components/ui/burger-menu";
import { useRole } from "@/contexts/RoleContext";
import { QuantumPulse } from "@/components/admin/QuantumPulse";
import { getNavigationForRole } from "@/config/navigation.config";
import { SidebarErrorBoundary } from "@/components/SidebarErrorBoundary";
import {
  Sidebar,
  SidebarGroup,
  SidebarFooter,
} from "@/components/AnimatedSidebar";

interface AppLayoutProps {
  children: ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  const { user, signOut } = useAuth();
  const { t } = useTranslation();
  useTranslationSync(); // Keep all components in sync with language changes
  const location = useLocation();
  const { currentRole } = useRole();
  const [userProfile, setUserProfile] = useState<{ full_name: string; avatar_url: string | null } | null>(null);
  
  // Lifted sidebar state - single source of truth for mobile menu
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Stable toggle callback to prevent re-renders
  const handleSidebarToggle = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  // Sync sidebar open state for header burger menu
  const handleSidebarOpenChange = useCallback((open: boolean) => {
    setSidebarOpen(open);
  }, []);

  // Fetch user profile data including avatar
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single();

      if (!error && data) {
        setUserProfile(data);
      }
    };

    fetchUserProfile();
  }, [user?.id]);

  // Determine navigation based on current role from context
  // Memoize to prevent unnecessary recalculations and stop accumulation
  const navigationGroups = useMemo(
    () => getNavigationForRole(currentRole),
    [currentRole]
  );

  const getFirstName = () => {
    if (userProfile?.full_name) {
      return userProfile.full_name.split(" ")[0];
    }
    if (user?.email) {
      return user.email.split("@")[0];
    }
    return "User";
  };

  const firstName = getFirstName();
  const profilePath = '/profile';

  return (
    <div className="min-h-screen flex w-full bg-background">
      <DynamicBackground />

      {/* Skip to main content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-modal focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px] flex items-center"
      >
        Skip to main content
      </a>

      {/* Global Header - Fixed Top - Responsive Layout */}
      <header
        className="fixed top-0 left-0 right-0 h-14 sm:h-16 bg-card/30 backdrop-blur-[var(--blur-glass)] border-b border-border/20 z-header flex items-center justify-between px-2 sm:px-4 shadow-[var(--shadow-glass-md)] md:left-20"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        {/* Left: Menu Trigger (Mobile Only) */}
        <div className="flex items-center gap-2 md:hidden min-w-[44px]">
          <div className="min-h-[44px] min-w-[44px] flex items-center justify-center">
            <BurgerMenu
              isOpen={sidebarOpen}
              onClick={handleSidebarToggle}
            />
          </div>
        </div>

        {/* Center: Logo (Mobile Only) */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center md:hidden">
          <img
            src={quantumClubLogoLightShort}
            alt="Quantum Club"
            className="h-[77px] w-auto dark:block hidden"
          />
          <img
            src={quantumClubLogoDarkShort}
            alt="Quantum Club"
            className="h-[77px] w-auto dark:hidden block"
          />
        </div>

        {/* Right: Desktop buttons (hidden on mobile) + Notification Bell */}
        <div className="flex items-center gap-1 sm:gap-2 min-w-[44px] justify-end ml-auto">
          <div className="hidden md:flex items-center gap-1 sm:gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
            <GlobalRoleSwitcher />
            <MotionToggle />
            <MusicPlayer />
          </div>
          <NotificationBell />
        </div>
      </header>

      {/* Animated Sidebar with Glass Effect - Wrapped in Error Boundary */}
      <SidebarErrorBoundary>
        <Sidebar
          logoLight={quantumClubLogoLightShort}
          logoDark={quantumClubLogoDarkShort}
          logoLightShort={quantumClubLogoLight}
          logoDarkShort={quantumClubLogoDark}
          open={sidebarOpen}
          onOpenChange={handleSidebarOpenChange}
        >
          {navigationGroups.map((group) => (
            <SidebarGroup key={group.title} group={group} />
          ))}
          <SidebarFooter
            userName={firstName}
            userInitial={firstName[0].toUpperCase()}
            userAvatarUrl={userProfile?.avatar_url || null}
            onSignOut={signOut}
            profilePath={profilePath}
          />
        </Sidebar>
      </SidebarErrorBoundary>

      {/* Global Running Timer Header */}
      <GlobalRunningTimerHeader />

      {/* Main Content - Adjusted for sidebar - Mobile Optimized */}
      {/* Workspace routes (/messages, /admin/whatsapp) manage their own scrolling */}
      <main
        id="main-content"
        tabIndex={-1}
        className={cn(
          "flex-1 w-full md:ml-20",
          (location.pathname === '/messages' || location.pathname.startsWith('/admin/whatsapp'))
            ? 'overflow-hidden'
            : 'overflow-y-auto'
        )}
      >
        <div className={cn(
          "pt-14 sm:pt-16",
          (location.pathname === '/messages' || location.pathname.startsWith('/admin/whatsapp'))
            ? 'h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] flex flex-col'
            : 'min-h-screen pb-4'
        )}
          style={{
            paddingBottom: (location.pathname !== '/messages' && !location.pathname.startsWith('/admin/whatsapp'))
              ? 'max(env(safe-area-inset-bottom), 1rem)'
              : undefined
          }}
        >
          {children}
        </div>
      </main>

      {/* Global Navigation Tools */}
      <QuantumPulse />
      <CommandPalette />
      <Suspense fallback={null}>
        <ClubAIVoice />
      </Suspense>
      <GlobalCallNotificationProvider />
      <MeetingNotificationManager />
    </div>
  );
};
