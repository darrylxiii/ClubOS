import { useState, useEffect, ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import quantumClubLogo from "@/assets/quantum-club-logo.png";
import quantumClubLogoDark from "@/assets/quantum-logo-dark.png";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  LayoutDashboard,
  Briefcase,
  Building2,
  Gift,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
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
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationBell } from "@/components/NotificationBell";
import { NavigationGroup } from "@/components/NavigationGroup";
import { CommandPalette } from "@/components/CommandPalette";
import { GlobalRoleSwitcher } from "@/components/GlobalRoleSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useRole } from "@/contexts/RoleContext";

// Grouped Candidate Navigation
const candidateNavigationGroups = [
  {
    title: "Overview",
    icon: Layers,
    items: [
      { name: "Club Home", icon: Home, path: "/home" },
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
      { name: "Messages", icon: MessageSquare, path: "/messages" },
      { name: "Scheduling", icon: Calendar, path: "/scheduling" },
      { name: "Meeting History", icon: Video, path: "/meeting-history" },
      { name: "Interview Prep", icon: Clock, path: "/interview-prep" },
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
      { name: "Messages", icon: MessageSquare, path: "/messages" },
      { name: "Scheduling", icon: Calendar, path: "/scheduling" },
      { name: "Meeting History", icon: Video, path: "/meeting-history" },
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
      { name: "Messages", icon: MessageSquare, path: "/messages" },
      { name: "Scheduling", icon: Calendar, path: "/scheduling" },
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const location = useLocation();
  const { currentRole } = useRole();
  const [userProfile, setUserProfile] = useState<{ id: string } | null>(null);

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
    if (user?.email) {
      return user.email.split("@")[0];
    }
    return "User";
  };

  const firstName = getFirstName();
  const profilePath = '/profile';

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Global Header - Sticky at top, always visible */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-card/95 backdrop-blur-md border-b border-border z-[100] flex items-center justify-between px-4 gap-4 shadow-sm">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
        
        <div className="absolute left-1/2 -translate-x-1/2">
          <img 
            src={quantumClubLogoDark} 
            alt="Quantum Club" 
            className="h-9 w-auto dark:block hidden" 
          />
          <img 
            src={quantumClubLogo} 
            alt="Quantum Club" 
            className="h-9 w-auto dark:hidden block" 
          />
        </div>
        
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <GlobalRoleSwitcher />
          <NotificationBell />
        </div>
      </header>

      <aside
        className={cn(
          "fixed top-16 bottom-0 left-0 z-40 w-64 bg-card border-r border-border transform transition-transform duration-300 ease-in-out flex flex-col",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >

        <nav className="flex-1 overflow-y-auto py-6 px-3">
          <div className="space-y-3">
            {navigationGroups.map((group) => (
              <NavigationGroup
                key={group.title}
                title={group.title}
                icon={group.icon}
                items={group.items}
                defaultOpen={true}
              />
            ))}
          </div>
        </nav>

        <div className="p-4 border-t border-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-auto py-3 px-3"
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {firstName[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium">{firstName}</p>
                  <p className="text-xs text-muted-foreground">View profile</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-card">
              <DropdownMenuItem asChild>
                <Link to={profilePath} className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  <span>My Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/user-settings" className="cursor-pointer">
                  <Cog className="mr-2 h-4 w-4" />
                  <span>Account Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/settings" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleSignOut}
                className="cursor-pointer text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className={cn(
        "flex-1 w-full",
        location.pathname === '/messages' ? 'overflow-hidden' : 'overflow-y-auto'
      )}>
        <div className={cn(
          "min-h-screen pt-16",
          location.pathname !== '/messages' && 'pb-4'
        )}>{children}</div>
      </main>

      {/* Global Navigation Tools - Always Accessible */}
      <CommandPalette />
    </div>
  );
};
