import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ArrowRight,
  Briefcase,
  Building2
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Application {
  id: string;
  job_id: string;
  current_stage_index: number;
  stages: any[];
  status: string;
  created_at: string;
  updated_at: string;
  job: {
    title: string;
    company: {
      name: string;
    };
  };
}

export function ApplicationStatusTracker({ userId }: { userId: string }) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchApplications();

    // Subscribe to real-time updates
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
        () => fetchApplications()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select(`
          id,
          job_id,
          current_stage_index,
          stages,
          status,
          created_at,
          updated_at,
          jobs:job_id (
            title,
            companies:company_id (
              name
            )
          )
        `)
        .eq('candidate_id', userId)
        .order('updated_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      const formatted = data?.map(app => ({
        id: app.id,
        job_id: app.job_id,
        current_stage_index: app.current_stage_index || 0,
        stages: (app.stages as any[]) || [],
        status: app.status || 'active',
        created_at: app.created_at,
        updated_at: app.updated_at,
        job: {
          title: (app.jobs as any)?.title || 'Unknown Position',
          company: {
            name: (app.jobs as any)?.companies?.name || 'Unknown Company'
          }
        }
      })) || [];

      setApplications(formatted);
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStageInfo = (app: Application) => {
    const currentStage = app.stages[app.current_stage_index];
    const stageName = currentStage?.name || 'Applied';
    const totalStages = app.stages.length || 5;
    const progress = ((app.current_stage_index + 1) / totalStages) * 100;
    
    // Determine color based on status
    if (app.status === 'rejected') {
      return {
        label: 'Not Selected',
        progress: 0,
        color: 'bg-destructive/10 text-destructive border-destructive/30',
        icon: XCircle
      };
    }
    
    if (app.status === 'hired' || stageName.toLowerCase().includes('offer')) {
      return {
        label: stageName,
        progress: 100,
        color: 'bg-success/10 text-success border-success/30',
        icon: CheckCircle2
      };
    }
    
    return {
      label: stageName,
      progress: progress,
      color: 'bg-primary/10 text-primary border-primary/30',
      icon: Clock
    };
  };

  const getDaysInStage = (updatedAt: string) => {
    return formatDistanceToNow(new Date(updatedAt), { addSuffix: false });
  };

  if (loading) {
    return (
      <Card className="border-2 border-foreground">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (applications.length === 0) {
    return (
      <Card className="border-2 border-foreground">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-black uppercase">
            <div className="w-1 h-6 bg-foreground"></div>
            Application Pipeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-4">
            <Briefcase className="w-12 h-12 mx-auto text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No active applications yet</p>
            <Button onClick={() => navigate('/jobs')} variant="default">
              Browse Jobs
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-foreground">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-black uppercase">
          <div className="w-1 h-6 bg-foreground"></div>
          Application Pipeline
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {applications.map((app) => {
          const stageInfo = getStageInfo(app);
          const StageIcon = stageInfo.icon;
          
          return (
            <div
              key={app.id}
              className="p-4 rounded-lg bg-background/30 border border-border/30 hover:bg-background/40 transition-all cursor-pointer"
              onClick={() => navigate(`/applications/${app.id}`)}
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                    <p className="text-sm text-muted-foreground truncate">
                      {app.job.company.name}
                    </p>
                  </div>
                  <h4 className="font-bold truncate">{app.job.title}</h4>
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
                    In stage for {getDaysInStage(app.updated_at)}
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
            variant="outline"
            className="w-full"
            onClick={() => navigate('/applications')}
          >
            View All Applications
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
