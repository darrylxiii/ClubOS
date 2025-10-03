import { useState, useEffect, ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import quantumClubLogo from "@/assets/quantum-club-logo.png";
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
  Bot,
  Users,
  Rss,
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

const candidateNavigationItems = [
  { name: "Club AI", icon: Sparkles, path: "/club-ai" },
  { name: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { name: "Feed", icon: Rss, path: "/feed" },
  { name: "Messages", icon: MessageSquare, path: "/messages" },
  { name: "Scheduling", icon: Calendar, path: "/scheduling" },
  { name: "Jobs", icon: Briefcase, path: "/jobs" },
  { name: "Applications", icon: FileText, path: "/applications" },
  { name: "Companies", icon: Building2, path: "/companies" },
  { name: "Club Task Pilot", icon: ListTodo, path: "/tasks-pilot" },
  { name: "Referrals", icon: Gift, path: "/referrals" },
  { name: "Interview Prep", icon: Clock, path: "/interview-prep" },
];

const partnerNavigationItems = [
  { name: "Partner Dashboard", icon: Building2, path: "/partner-dashboard" },
  { name: "Feed", icon: Rss, path: "/feed" },
  { name: "Jobs", icon: Briefcase, path: "/jobs" },
  { name: "Applications", icon: FileText, path: "/applications" },
  { name: "Messages", icon: MessageSquare, path: "/messages" },
  { name: "Companies", icon: Building, path: "/companies" },
  { name: "Profile", icon: User, path: "/profile" },
];

interface AppLayoutProps {
  children: ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const location = useLocation();
  const [isPartner, setIsPartner] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkUserStatus = async () => {
      if (!user) return;
      
      const { data: memberData } = await supabase
        .from('company_members')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();
      
      setIsPartner(!!memberData);

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      
      setIsAdmin(!!roleData);
    };

    checkUserStatus();
  }, [user]);
  
  const navigationItems = isPartner ? partnerNavigationItems : candidateNavigationItems;

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

  return (
    <div className="min-h-screen flex w-full bg-background">
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-card border-b border-border z-50 flex items-center justify-between px-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
        <img src={quantumClubLogo} alt="Quantum Club" className="h-8 w-auto" />
        <NotificationBell />
      </div>

      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-40 w-64 bg-card border-r border-border transform transition-transform duration-300 ease-in-out flex flex-col",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="h-16 flex items-center justify-between border-b border-border px-4">
          <img src={quantumClubLogo} alt="Quantum Club" className="h-10 w-auto" />
          <div className="lg:block hidden">
            <NotificationBell />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-3">
          <div className="space-y-1">
            {isAdmin && (
              <Link
                to="/admin"
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors",
                  location.pathname === "/admin"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Users className="h-5 w-5" />
                <span>Admin Panel</span>
              </Link>
            )}
            
            {navigationItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
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
                <Link to="/profile" className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/profile" className="cursor-pointer">
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

      <main className="flex-1 overflow-y-auto">
        <div className="min-h-screen mt-16 lg:mt-0">{children}</div>
      </main>

      <div className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border z-50 flex items-center justify-around">
        {navigationItems.slice(0, 5).map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 h-full",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
