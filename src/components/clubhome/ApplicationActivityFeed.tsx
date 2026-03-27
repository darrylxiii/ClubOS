import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useTranslation } from 'react-i18next';

interface ActivityRow {
  id: string;
  position: string;
  company_name: string;
  status: string;
  stage_updated_at: string | null;
  updated_at: string;
  current_stage_index: number;
}

const stageConfig: Record<string, { label: string; className: string }> = {
  applied: {
    label: "Applied",
    className: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  },
  screening: {
    label: "Screening",
    className: "bg-warning/10 text-warning border-warning/20",
  },
  interview: {
    label: "Interview",
    className: "bg-accent/10 text-accent border-accent/20",
  },
  offer: {
    label: "Offer",
    className: "bg-success/10 text-success border-success/20",
  },
  rejected: {
    label: "Rejected",
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
  hired: {
    label: "Hired",
    className: "bg-success/10 text-success border-success/20",
  },
};

const getStageFromStatus = (status: string) => {
  const key = status.toLowerCase();
  return stageConfig[key] || { label: status, className: "bg-muted text-muted-foreground border-border/20" };
};

export const ApplicationActivityFeed = () => {
  const { t } = useTranslation('common');
  const { data: activities, isLoading } = useQuery({
    queryKey: ["application-activity-feed"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Resolve candidate profile ID for admin-sourced applications
      const { data: cp } = await supabase
        .from('candidate_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      const orFilter = cp?.id
        ? `user_id.eq.${user.id},candidate_id.eq.${cp.id}`
        : `user_id.eq.${user.id}`;

      const { data, error } = await supabase
        .from("applications")
        .select("id, position, company_name, status, stage_updated_at, updated_at, current_stage_index")
        .or(orFilter)
        .order("updated_at", { ascending: false })
        .limit(8);

      if (error) throw error;
      return (data as ActivityRow[]) || [];
    },
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <Card className="glass-subtle rounded-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-primary" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 rounded-xl" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!activities || activities.length === 0) {
    return null;
  }

  return (
    <Card className="glass-subtle rounded-2xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-primary" />
            Recent Activity
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {activities.length} updates
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {activities.map((item) => {
          const stage = getStageFromStatus(item.status);
          const timeAgo = formatDistanceToNow(
            new Date(item.stage_updated_at || item.updated_at),
            { addSuffix: true }
          );

          return (
            <Link
              key={item.id}
              to={`/applications/${item.id}`}
              className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-card/40 transition-colors group"
            >
              {/* Timeline dot */}
              <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-primary/50" />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">
                    {item.position}
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border",
                      stage.className
                    )}
                  >
                    {stage.label}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {item.company_name} · {timeAgo}
                </p>
              </div>

              <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            </Link>
          );
        })}

        <Button variant="ghost" size="sm" className="w-full mt-1" asChild>
          <Link to="/applications">
            View all applications
            <ArrowRight className="h-3 w-3 ml-1" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};
