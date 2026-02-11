import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Clock, 
  ArrowRight,
  Briefcase,
  Building2
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useApplications } from "@/hooks/useApplications";
import { getApplicationStageInfo } from "@/lib/applicationStageUtils";

export function ApplicationStatusTracker({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Use unified hook instead of manual fetch
  const { data: applications = [], isLoading: loading } = useApplications(userId, true);

  // Subscribe to real-time updates - invalidate query instead of manual refetch
  useEffect(() => {
    const channel = supabase
      .channel('application-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'applications',
          filter: `candidate_id=eq.${userId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['applications', userId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  // Transform applications to tracker format and get stage info using shared utility
  const getStageInfo = (app: any) => {
    return getApplicationStageInfo({
      currentStageIndex: app.current_stage_index || 0,
      stages: app.stages || [],
      status: app.status,
    });
  };

  const getDaysInStage = (dateStr: string) => {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: false });
  };

  if (loading) {
    return (
      <div className="glass-subtle rounded-2xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-3/4"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  // Limit to 5 most recent
  const displayApps = applications.slice(0, 5);

  if (displayApps.length === 0) {
    return (
      <div className="glass-subtle rounded-2xl p-6">
        <h3 className="text-sm font-medium text-muted-foreground mb-6">Application Pipeline</h3>
        <div className="text-center py-8 space-y-4">
          <Briefcase className="w-12 h-12 mx-auto text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">No active applications yet</p>
          <Button onClick={() => navigate('/jobs')} variant="default">
            Browse Jobs
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-subtle rounded-2xl p-6">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">Application Pipeline</h3>
      <div className="space-y-3">
        {displayApps.map((app) => {
          const stageInfo = getStageInfo(app);
          const StageIcon = stageInfo.icon;
          
          return (
            <div
              key={app.id}
              className="p-4 rounded-xl glass-subtle hover:bg-foreground/5 transition-all cursor-pointer"
              onClick={() => navigate(`/applications/${app.id}`)}
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                    <p className="text-sm text-muted-foreground truncate">
                      {app.company_name || app.job?.companies?.name || 'Unknown Company'}
                    </p>
                  </div>
                  <h4 className="font-bold truncate">{app.position}</h4>
                </div>
                <Badge className={`shrink-0 border ${stageInfo.color}`}>
                  <StageIcon className="w-3 h-3 mr-1" />
                  {stageInfo.label}
                </Badge>
              </div>

              <div className="space-y-2">
                <Progress value={stageInfo.progress} className="h-2" />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    In stage for {getDaysInStage(app.applied_at)}
                  </span>
                  <span className="flex items-center gap-1 hover:text-foreground transition-colors">
                    View Details
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {applications.length >= 5 && (
          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={() => navigate('/applications')}
          >
            View All Applications
          </Button>
        )}
      </div>
    </div>
  );
}
