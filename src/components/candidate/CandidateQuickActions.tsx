import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Search,
  FileText,
  Calendar,
  MessageSquare,
  Sparkles,
  TrendingUp,
  DollarSign,
  Target,
  PenLine
} from "lucide-react";

interface QuickAction {
  icon: any;
  label: string;
  description: string;
  path: string;
  variant: "default" | "outline";
  badge?: string;
  condition?: boolean;
}

interface CandidateQuickActionsProps {
  profileCompletion: number;
  newMatches: number;
  pendingApplications: number;
  upcomingInterviews: number;
}

export function CandidateQuickActions({
  profileCompletion,
  newMatches,
  pendingApplications,
  upcomingInterviews
}: CandidateQuickActionsProps) {
  const navigate = useNavigate();

  const actions: QuickAction[] = [
    {
      icon: Search,
      label: "Browse Jobs",
      description: "Find your next opportunity",
      path: "/jobs",
      variant: "default",
      badge: newMatches > 0 ? `${newMatches} new matches` : undefined,
      condition: true
    },
    {
      icon: PenLine,
      label: "Cover Letter",
      description: "AI-powered writing",
      path: "/cover-letter-builder",
      variant: "outline",
      badge: "New",
      condition: true
    },
    {
      icon: DollarSign,
      label: "Salary Insights",
      description: "Market intelligence",
      path: "/salary-insights",
      variant: "outline",
      condition: true
    },
    {
      icon: MessageSquare,
      label: "Interview Prep",
      description: "Practice & tips",
      path: "/interview-prep",
      variant: "outline",
      condition: true
    },
    {
      icon: Target,
      label: "Career Path",
      description: "Plan your growth",
      path: "/career-path",
      variant: "outline",
      condition: true
    },
    {
      icon: TrendingUp,
      label: "Track Applications",
      description: `${pendingApplications} active`,
      path: "/applications",
      variant: "outline",
      badge: pendingApplications > 0 ? `${pendingApplications}` : undefined,
      condition: pendingApplications > 0
    },
    {
      icon: Sparkles,
      label: "AI Assistant",
      description: "Get instant help",
      path: "/club-ai",
      variant: "outline",
      condition: true
    }
  ];

  // Filter actions based on conditions and limit to 4
  const visibleActions = actions.filter(action => action.condition !== false).slice(0, 4);

  return (
    <div className="glass-subtle rounded-2xl p-6">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">Quick Actions</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {visibleActions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.label}
                variant="ghost"
                className="h-auto flex-col items-start p-4 text-left gap-2 relative overflow-hidden glass-subtle border-0 hover:bg-foreground/5"
                onClick={() => navigate(action.path)}
              >
                {action.badge && (
                  <Badge 
                    className="absolute top-2 right-2 text-[10px] px-1.5 py-0.5 bg-primary/20 text-primary border-primary/30"
                  >
                    {action.badge}
                  </Badge>
                )}
                <Icon className="h-5 w-5" />
                <div>
                  <div className="font-bold">{action.label}</div>
                  <div className="text-xs text-muted-foreground font-normal">
                    {action.description}
                  </div>
                </div>
              </Button>
            );
          })}
      </div>
    </div>
  );
}
