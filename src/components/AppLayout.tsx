import { ReactNode, useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
// Short QC icons (for collapsed state) - "transparent" files are the small icons
import quantumClubLogoDarkShort from "@/assets/quantum-logo-dark-transparent.png"; // QC icon - black for light theme
import quantumClubLogoLightShort from "@/assets/quantum-logo-light-transparent.png"; // QC icon - white for dark theme
// Full logos (for expanded state) - these are the full text logos
import quantumClubLogoDark from "@/assets/quantum-club-logo.png"; // Full logo - black for light theme
import quantumClubLogoLight from "@/assets/quantum-logo-dark.png"; // Full logo - white for dark theme
import {
  Briefcase,
  Building2,
  Gift,
  FileText,
  Settings,
  Clock,
  User,
  ListTodo,
  Sparkles,
  Calendar,
  MessageSquare,
  Video,
  Home,
  Building,
  Users,
  Rss,
  Layers,
  Zap,
  Cog,
  Share2,
  BarChart3,
  TrendingUp,
  Trophy,
  MessagesSquare,
  GraduationCap,
  ClipboardCheck,
  Mail,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/NotificationBell";
import { MusicPlayer } from "@/components/MusicPlayer";
import { CommandPalette } from "@/components/CommandPalette";
import { GlobalRoleSwitcher } from "@/components/GlobalRoleSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MotionToggle } from "@/components/MotionToggle";
import { useRole } from "@/contexts/RoleContext";
import { getNavigationForRole } from "@/config/navigation.config";
import {
  Sidebar,
  SidebarGroup,
  SidebarFooter,
} from "@/components/AnimatedSidebar";

interface AppLayoutProps {
  children: ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  const { user } = useAuth();
  const location = useLocation();
  const { currentRole } = useRole();
  const [userProfile, setUserProfile] = useState<{ full_name: string; avatar_url: string | null } | null>(null);

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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  };

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
      {/* Global Header - Fixed Top */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-card/30 backdrop-blur-[var(--blur-glass)] border-b border-border/20 z-[90] flex items-center justify-end px-4 gap-2 shadow-[var(--shadow-glass-md)] md:left-20">
        <ThemeToggle />
        <GlobalRoleSwitcher />
        <MotionToggle />
        <MusicPlayer />
        <NotificationBell />
      </header>

      {/* Animated Sidebar with Glass Effect */}
      <Sidebar
        logoLight={quantumClubLogoLight}
        logoDark={quantumClubLogoDark}
        logoLightShort={quantumClubLogoLightShort}
        logoDarkShort={quantumClubLogoDarkShort}
      >
        {navigationGroups.map((group) => (
          <SidebarGroup key={group.title} group={group} />
        ))}
        <SidebarFooter
          userName={firstName}
          userInitial={firstName[0].toUpperCase()}
          userAvatarUrl={userProfile?.avatar_url || null}
          onSignOut={handleSignOut}
          profilePath={profilePath}
        />
      </Sidebar>

      {/* Main Content - Adjusted for sidebar */}
      <main className={cn(
        "flex-1 w-full md:ml-20",
        location.pathname === '/messages' ? 'overflow-hidden' : 'overflow-y-auto'
      )}>
        <div className={cn(
          "min-h-screen pt-16",
          location.pathname !== '/messages' && 'pb-4'
        )}>{children}</div>
      </main>

      {/* Global Navigation Tools */}
      <CommandPalette />
    </div>
  );
};
