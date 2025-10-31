import { ReactNode, useState, useEffect } from "react";
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
import {
  Sidebar,
  SidebarGroup,
  SidebarFooter,
} from "@/components/AnimatedSidebar";

// Grouped Candidate Navigation
const candidateNavigationGroups = [
  {
    title: "Overview",
    icon: Layers,
    items: [
      { name: "Club Home", icon: Home, path: "/home" },
      { name: "Dashboard", icon: BarChart3, path: "/dashboard" },
      { name: "Feed", icon: Rss, path: "/feed" },
      { name: "Achievements", icon: Trophy, path: "/achievements" },
    ],
  },
  {
    title: "Career",
    icon: Briefcase,
    items: [
      { name: "Jobs", icon: Briefcase, path: "/jobs" },
      { name: "Applications", icon: FileText, path: "/applications" },
      { name: "Companies", icon: Building2, path: "/companies" },
      { name: "Referrals", icon: Gift, path: "/referrals" },
      { name: "Assessments", icon: ClipboardCheck, path: "/assessments" },
    ],
  },
  {
    title: "Social Media",
    icon: Share2,
    items: [
      { name: "Social Feed", icon: Share2, path: "/social-feed" },
    ],
  },
  {
    title: "Communication",
    icon: MessageSquare,
    items: [
      { name: "Inbox", icon: Mail, path: "/inbox" },
      { name: "Messages", icon: MessageSquare, path: "/messages" },
      { name: "Meetings", icon: Video, path: "/meetings" },
      { name: "Scheduling", icon: Calendar, path: "/scheduling" },
      { name: "Meeting Intelligence", icon: Video, path: "/meeting-intelligence" },
      { name: "Interview Prep", icon: Clock, path: "/interview-prep" },
    ],
  },
  {
    title: "Learning",
    icon: GraduationCap,
    items: [
      { name: "Academy", icon: GraduationCap, path: "/academy" },
    ],
  },
  {
    title: "AI & Tools",
    icon: Zap,
    items: [
      { name: "Club AI", icon: Sparkles, path: "/club-ai" },
      { name: "Tasks", icon: ListTodo, path: "/unified-tasks" },
    ],
  },
  {
    title: "Settings",
    icon: Cog,
    items: [
      { name: "My Profile", icon: User, path: "/profile" },
      { name: "Settings", icon: Settings, path: "/settings" },
    ],
  },
];

// Grouped Partner Navigation
const partnerNavigationGroups = [
  {
    title: "Overview",
    icon: Layers,
    items: [
      { name: "Club Home", icon: Home, path: "/home" },
      { name: "Dashboard", icon: BarChart3, path: "/partner/dashboard" },
      { name: "Feed", icon: Rss, path: "/feed" },
      { name: "Achievements", icon: Trophy, path: "/achievements" },
    ],
  },
  {
    title: "Hiring",
    icon: Briefcase,
    items: [
      { name: "Jobs", icon: Briefcase, path: "/jobs" },
      { name: "Applicants", icon: FileText, path: "/applications" },
      { name: "Companies", icon: Building, path: "/companies" },
      { name: "Assessments", icon: ClipboardCheck, path: "/assessments" },
    ],
  },
  {
    title: "Social Media",
    icon: Share2,
    items: [
      { name: "Social Feed", icon: Share2, path: "/social-feed" },
      { name: "Analytics", icon: BarChart3, path: "/analytics" },
    ],
  },
  {
    title: "Communication",
    icon: MessageSquare,
    items: [
      { name: "Inbox", icon: Mail, path: "/inbox" },
      { name: "Messages", icon: MessageSquare, path: "/messages" },
      { name: "Meetings", icon: Video, path: "/meetings" },
      { name: "Scheduling", icon: Calendar, path: "/scheduling" },
      { name: "Meeting Intelligence", icon: Video, path: "/meeting-intelligence" },
    ],
  },
  {
    title: "Learning",
    icon: GraduationCap,
    items: [
      { name: "Academy", icon: GraduationCap, path: "/academy" },
    ],
  },
  {
    title: "AI & Tools",
    icon: Zap,
    items: [
      { name: "Club AI", icon: Sparkles, path: "/club-ai" },
      { name: "Tasks", icon: ListTodo, path: "/unified-tasks" },
    ],
  },
  {
    title: "Settings",
    icon: Cog,
    items: [
      { name: "My Profile", icon: User, path: "/profile" },
      { name: "Settings", icon: Settings, path: "/settings" },
    ],
  },
];

// Grouped Admin Navigation
const adminNavigationGroups = [
  {
    title: "Overview",
    icon: Layers,
    items: [
      { name: "Club Home", icon: Home, path: "/home" },
      { name: "Dashboard", icon: BarChart3, path: "/admin/dashboard" },
      { name: "Admin Panel", icon: Users, path: "/admin" },
      { name: "Feed", icon: Rss, path: "/feed" },
      { name: "Achievements", icon: Trophy, path: "/achievements" },
    ],
  },
  {
    title: "Management",
    icon: Building,
    items: [
      { name: "Companies", icon: Building, path: "/companies" },
      { name: "Jobs", icon: Briefcase, path: "/jobs" },
      { name: "Applications", icon: FileText, path: "/applications" },
      { name: "Assessments", icon: ClipboardCheck, path: "/assessments" },
      { name: "Feedback Database", icon: MessagesSquare, path: "/feedback-database" },
    ],
  },
  {
    title: "Social Media",
    icon: Share2,
    items: [
      { name: "Social Feed", icon: Share2, path: "/social-feed" },
      { name: "Management", icon: BarChart3, path: "/social-management" },
      { name: "Analytics", icon: TrendingUp, path: "/analytics" },
    ],
  },
  {
    title: "Communication",
    icon: MessageSquare,
    items: [
      { name: "Inbox", icon: Mail, path: "/inbox" },
      { name: "Messages", icon: MessageSquare, path: "/messages" },
      { name: "Meetings", icon: Video, path: "/meetings" },
      { name: "Scheduling", icon: Calendar, path: "/scheduling" },
    ],
  },
  {
    title: "Learning",
    icon: GraduationCap,
    items: [
      { name: "Academy", icon: GraduationCap, path: "/academy" },
    ],
  },
  {
    title: "AI & Tools",
    icon: Zap,
    items: [
      { name: "Club AI", icon: Sparkles, path: "/club-ai" },
      { name: "Tasks", icon: ListTodo, path: "/unified-tasks" },
    ],
  },
  {
    title: "Settings",
    icon: Cog,
    items: [
      { name: "My Profile", icon: User, path: "/profile" },
      { name: "Settings", icon: Settings, path: "/settings" },
    ],
  },
];

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
  const navigationGroups = currentRole === 'admin'
    ? adminNavigationGroups
    : currentRole === 'partner'
    ? partnerNavigationGroups
    : candidateNavigationGroups;

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
