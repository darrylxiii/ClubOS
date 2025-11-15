import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { Home, LayoutDashboard, Briefcase, User, Users, LogOut, Video, CheckSquare, FolderOpen, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { TaskSidebar } from "@/components/TaskSidebar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { PilotFloatingButton } from "@/components/clubpilot/PilotFloatingButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [showMobileTasks, setShowMobileTasks] = useState(false);

  const navItems = [
    { path: "/", icon: Home, label: "Home" },
    { path: "/dashboard", icon: LayoutDashboard, label: "My Pipeline" },
    { path: "/applications", icon: FolderOpen, label: "Applications" },
    { path: "/companies", icon: Building2, label: "Companies" },
    { path: "/jobs", icon: Briefcase, label: "Opportunities" },
    { path: "/meeting-intelligence", icon: Video, label: "Meeting Intelligence" },
    { path: "/referrals", icon: Users, label: "Referrals" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b-2 border-foreground bg-background sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-foreground text-background flex items-center justify-center font-black text-lg group-hover:scale-110 transition-transform">
              QC
            </div>
            <div>
              <h1 className="text-lg font-black uppercase tracking-tight">The Quantum Club</h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">OS v1.0</p>
            </div>
          </Link>
          
          <nav className="hidden md:flex items-center gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 border-2 transition-all duration-200 font-bold uppercase text-xs tracking-wider",
                    isActive
                      ? "bg-foreground text-background border-foreground"
                      : "border-foreground hover:bg-foreground hover:text-background"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            
            {/* Tasks Button for Mobile/Tablet */}
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  className="xl:hidden flex items-center gap-2 border-2 border-foreground hover:bg-foreground hover:text-background font-bold uppercase text-xs tracking-wider"
                >
                  <CheckSquare className="w-4 h-4" />
                  <span>Tasks</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:w-96 p-0">
                <TaskSidebar />
              </SheetContent>
            </Sheet>
          </nav>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="flex items-center gap-2 border-2 border-foreground hover:bg-foreground hover:text-background font-bold uppercase text-xs tracking-wider"
              >
                <User className="w-4 h-4" />
                <span className="hidden md:inline">
                  {user?.email?.split("@")[0] || "Account"}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-background border-2 border-foreground z-50" align="end">
              <DropdownMenuItem asChild>
                <Link
                  to="/settings"
                  className="flex items-center gap-2 cursor-pointer font-bold uppercase text-xs tracking-wider"
                >
                  <User className="w-4 h-4" />
                  SETTINGS
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={signOut}
                className="flex items-center gap-2 cursor-pointer font-bold uppercase text-xs tracking-wider text-destructive"
              >
                <LogOut className="w-4 h-4" />
                SIGN OUT
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex">
        <main className="flex-1 container mx-auto px-4 py-8">
          {children}
        </main>

        {/* Task Sidebar - Desktop Only */}
        <aside className="hidden xl:block w-96 border-l border-border sticky top-[73px] h-[calc(100vh-73px)] overflow-hidden">
          <TaskSidebar />
        </aside>
      </div>

      {/* Mobile Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t-2 border-foreground">
        <div className="flex items-center justify-around py-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center gap-1 px-4 py-2 transition-all duration-200",
                  isActive
                    ? "text-foreground font-bold"
                    : "text-muted-foreground"
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Club Pilot Floating Button */}
      <PilotFloatingButton />
    </div>
  );
};
