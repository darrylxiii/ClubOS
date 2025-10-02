import { Link, useLocation } from "react-router-dom";
import { Home, LayoutDashboard, Briefcase, User } from "lucide-react";
import { cn } from "@/lib/utils";

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();

  const navItems = [
    { path: "/", icon: Home, label: "Home" },
    { path: "/dashboard", icon: LayoutDashboard, label: "My Pipeline" },
    { path: "/jobs", icon: Briefcase, label: "Opportunities" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-accent blur-sm opacity-50"></div>
              <div className="relative w-10 h-10 rounded bg-gradient-hero flex items-center justify-center border border-accent/20">
                <span className="text-accent font-bold text-lg">QC</span>
              </div>
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground tracking-tight">The Quantum Club</h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Operating System</p>
            </div>
          </div>
          
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200",
                    isActive
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <Link to="/profile">
            <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
              <User className="w-4 h-4" />
              <span className="hidden md:inline">Profile</span>
            </button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {children}
      </main>

      {/* Mobile Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg">
        <div className="flex items-center justify-around py-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all duration-200",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
