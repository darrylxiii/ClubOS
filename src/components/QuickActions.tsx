import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Briefcase, 
  MessageSquare, 
  Calendar, 
  FileText, 
  Sparkles,
  Plus,
  Search
} from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";

export const QuickActions = () => {
  const navigate = useNavigate();
  const { role } = useUserRole();

  const candidateActions = [
    {
      icon: Search,
      label: "Browse Jobs",
      description: "Discover elite opportunities",
      action: () => navigate("/jobs"),
      variant: "default" as const,
    },
    {
      icon: MessageSquare,
      label: "Message Strategist",
      description: "Get expert guidance",
      action: () => navigate("/messages"),
      variant: "outline" as const,
    },
    {
      icon: Calendar,
      label: "Schedule Meeting",
      description: "Book a consultation",
      action: () => navigate("/scheduling"),
      variant: "outline" as const,
    },
    {
      icon: Sparkles,
      label: "Ask AI",
      description: "Get instant help",
      action: () => navigate("/club-ai"),
      variant: "outline" as const,
    },
  ];

  const partnerActions = [
    {
      icon: Plus,
      label: "Post New Job",
      description: "Create job posting",
      action: () => navigate("/jobs"),
      variant: "default" as const,
    },
    {
      icon: FileText,
      label: "View Applicants",
      description: "Manage pipeline",
      action: () => navigate("/applications"),
      variant: "outline" as const,
    },
    {
      icon: MessageSquare,
      label: "Messages",
      description: "Candidate conversations",
      action: () => navigate("/messages"),
      variant: "outline" as const,
    },
    {
      icon: Sparkles,
      label: "AI Assistant",
      description: "Optimize hiring",
      action: () => navigate("/club-ai"),
      variant: "outline" as const,
    },
  ];

  const adminActions = [
    {
      icon: Plus,
      label: "Manage Companies",
      description: "Company administration",
      action: () => navigate("/admin"),
      variant: "default" as const,
    },
    {
      icon: Briefcase,
      label: "Review Jobs",
      description: "Job moderation",
      action: () => navigate("/jobs"),
      variant: "outline" as const,
    },
    {
      icon: MessageSquare,
      label: "System Messages",
      description: "Communication hub",
      action: () => navigate("/messages"),
      variant: "outline" as const,
    },
  ];

  const getActions = () => {
    switch (role) {
      case "partner":
        return partnerActions;
      case "admin":
        return adminActions;
      default:
        return candidateActions;
    }
  };

  const actions = getActions();

  return (
    <Card className="border-2 border-foreground">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-black uppercase">
          <div className="w-1 h-6 bg-foreground"></div>
          Quick Actions
        </CardTitle>
        <CardDescription>
          Take action on your most important tasks
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.label}
                variant={action.variant}
                className="h-auto flex-col items-start p-4 text-left gap-2"
                onClick={action.action}
              >
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
      </CardContent>
    </Card>
  );
};
