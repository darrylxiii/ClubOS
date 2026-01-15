import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Briefcase, 
  Target, 
  TrendingUp, 
  Calendar,
  Sparkles,
  ChevronRight,
  Users,
  Star
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface MatchedRole {
  id: string;
  title: string;
  company: string;
  matchScore: number;
  matchReasons: string[];
}

interface CareerInsight {
  type: "skill_gap" | "opportunity" | "coaching";
  title: string;
  description: string;
  actionLabel?: string;
}

export function MemberAgentWidget() {
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null);

  const { data: matchedRoles, isLoading: rolesLoading } = useQuery({
    queryKey: ["member-agent-matches"],
    queryFn: async () => {
      // In production, this would call the agent orchestrator
      const { data: jobs } = await supabase
        .from("jobs")
        .select("id, title, companies(name)")
        .eq("status", "published")
        .limit(3);

      return (jobs || []).map((job: any) => ({
        id: job.id,
        title: job.title,
        company: job.companies?.name || "Unknown",
        matchScore: Math.floor(Math.random() * 30) + 70,
        matchReasons: ["Skills match", "Experience level", "Industry fit"],
      })) as MatchedRole[];
    },
  });

  const { data: insights } = useQuery({
    queryKey: ["member-agent-insights"],
    queryFn: async (): Promise<CareerInsight[]> => {
      // In production, this would come from the AI analysis
      return [
        {
          type: "opportunity",
          title: "3 new roles match your profile",
          description: "Based on your experience and preferences, QUIN found new opportunities that could accelerate your career.",
          actionLabel: "View Matches",
        },
        {
          type: "skill_gap",
          title: "Add cloud certifications",
          description: "Candidates with AWS or Azure certifications are seeing 40% higher response rates for your target roles.",
          actionLabel: "Learn More",
        },
        {
          type: "coaching",
          title: "Upcoming interview preparation",
          description: "You have an interview in 3 days. QUIN has prepared a briefing with company research and smart questions.",
          actionLabel: "View Prep",
        },
      ];
    },
  });

  const { data: applicationStats } = useQuery({
    queryKey: ["member-application-stats"],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return null;

      const { data: applications } = await supabase
        .from("applications")
        .select("status")
        .eq("user_id", user.user.id);

      const total = applications?.length || 0;
      const active = applications?.filter(a => 
        ["applied", "screening", "interview"].includes(a.status)
      ).length || 0;

      return { total, active };
    },
  });

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          QUIN Career Agent
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 rounded-lg bg-muted/30">
            <p className="text-2xl font-bold">{applicationStats?.active || 0}</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/30">
            <p className="text-2xl font-bold">{matchedRoles?.length || 0}</p>
            <p className="text-xs text-muted-foreground">Matches</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/30">
            <p className="text-2xl font-bold">3</p>
            <p className="text-xs text-muted-foreground">Interviews</p>
          </div>
        </div>

        {/* AI Insights */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-1">
            <Target className="h-4 w-4" />
            Powered by QUIN
          </h4>
          {insights?.slice(0, 2).map((insight, index) => (
            <div
              key={index}
              className="p-3 rounded-lg border border-border/50 bg-background/50 hover:bg-muted/30 transition-colors cursor-pointer"
              onClick={() => setExpandedInsight(expandedInsight === insight.title ? null : insight.title)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="text-sm font-medium">{insight.title}</p>
                  {expandedInsight === insight.title && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {insight.description}
                    </p>
                  )}
                </div>
                <Badge variant="secondary" className="text-xs shrink-0">
                  {insight.type === "opportunity" && <Briefcase className="h-3 w-3 mr-1" />}
                  {insight.type === "skill_gap" && <TrendingUp className="h-3 w-3 mr-1" />}
                  {insight.type === "coaching" && <Calendar className="h-3 w-3 mr-1" />}
                  {insight.type}
                </Badge>
              </div>
            </div>
          ))}
        </div>

        {/* Top Matches */}
        {matchedRoles && matchedRoles.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-1">
              <Star className="h-4 w-4" />
              Top Matches
            </h4>
            {matchedRoles.slice(0, 2).map((role) => (
              <div
                key={role.id}
                className="flex items-center justify-between p-2 rounded-lg bg-muted/20"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{role.title}</p>
                  <p className="text-xs text-muted-foreground">{role.company}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {role.matchScore}%
                  </Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        )}

        <Button className="w-full" variant="outline" size="sm">
          <Users className="h-4 w-4 mr-2" />
          Talk to QUIN
        </Button>
      </CardContent>
    </Card>
  );
}
