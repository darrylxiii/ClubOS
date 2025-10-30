import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  path: string;
}

const routeLabels: Record<string, string> = {
  dashboard: "Dashboard",
  "partner-dashboard": "Partner Dashboard",
  admin: "Admin Panel",
  profile: "Profile",
  settings: "Settings",
  jobs: "Jobs",
  applications: "Applications",
  companies: "Companies",
  messages: "Messages",
  feed: "Community Feed",
  referrals: "Referrals",
  scheduling: "Scheduling",
  "meeting-history": "Meeting History",
  "meeting-intelligence": "Meeting Intelligence",
  "interview-prep": "Interview Prep",
  "club-ai": "Club AI",
  "tasks-pilot": "Club Task Pilot",
  onboarding: "Onboarding",
  "partner-onboarding": "Partner Onboarding",
};

export const Breadcrumb = () => {
  const location = useLocation();
  
  const getBreadcrumbs = (): BreadcrumbItem[] => {
    const pathParts = location.pathname.split("/").filter(Boolean);
    
    if (pathParts.length === 0) {
      return [{ label: "Home", path: "/" }];
    }

    const breadcrumbs: BreadcrumbItem[] = [];
    let currentPath = "";

    pathParts.forEach((part, index) => {
      currentPath += `/${part}`;
      const label = routeLabels[part] || part.charAt(0).toUpperCase() + part.slice(1);
      
      // Skip UUID-like segments (job IDs, etc.)
      if (part.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        return;
      }
      
      breadcrumbs.push({ label, path: currentPath });
    });

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  if (breadcrumbs.length <= 1 && location.pathname === "/") {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex items-center space-x-2 text-sm">
        <li>
          <Link
            to="/"
            className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <Home className="h-4 w-4" />
            <span className="sr-only">Home</span>
          </Link>
        </li>
        
        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1;
          
          return (
            <li key={crumb.path} className="flex items-center space-x-2">
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              {isLast ? (
                <span className="font-medium text-foreground">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  to={crumb.path}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
