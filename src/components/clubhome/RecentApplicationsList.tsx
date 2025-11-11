import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Eye, TrendingUp, X } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

interface Application {
  id: string;
  applied_at: string;
  position: string;
  current_stage_index: number;
  stages: any;
  user_id: string | null;
  candidate_id: string | null;
  match_score: number | null;
}

interface RecentApplicationsListProps {
  companyId: string;
}

export const RecentApplicationsList = ({ companyId }: RecentApplicationsListProps) => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [candidateNames, setCandidateNames] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchRecentApplications();
  }, [companyId]);

  const fetchRecentApplications = async () => {
    try {
      // First get company's job IDs
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id')
        .eq('company_id', companyId);

      if (!jobs || jobs.length === 0) {
        setLoading(false);
        return;
      }

      const jobIds = jobs.map(j => j.id);

      // Fetch recent applications
      const { data: apps, error } = await supabase
        .from('applications')
        .select('*')
        .in('job_id', jobIds)
        .order('applied_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      if (apps && apps.length > 0) {
        setApplications(apps);

        // Fetch candidate names
        const userIds = apps.map(a => a.user_id).filter(Boolean) as string[];
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', userIds);

          if (profiles) {
            const nameMap = profiles.reduce((acc, p) => {
              acc[p.id] = p.full_name || 'Anonymous';
              return acc;
            }, {} as Record<string, string>);
            setCandidateNames(nameMap);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching recent applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentStage = (app: Application) => {
    try {
      const stages = Array.isArray(app.stages) ? app.stages : JSON.parse(app.stages as any);
      return stages[app.current_stage_index]?.name || 'Unknown';
    } catch {
      return 'Unknown';
    }
  };

  const getStageColor = (stageName: string) => {
    const stage = stageName.toLowerCase();
    if (stage.includes('applied') || stage.includes('new')) return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    if (stage.includes('screening') || stage.includes('review')) return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
    if (stage.includes('interview')) return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
    if (stage.includes('offer') || stage.includes('final')) return 'bg-green-500/10 text-green-500 border-green-500/20';
    return 'bg-muted text-muted-foreground';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Recent Applications
          </CardTitle>
          <CardDescription>Latest candidate applications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (applications.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Recent Applications
          </CardTitle>
          <CardDescription>Latest candidate applications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">No applications yet</p>
            <p className="text-xs text-muted-foreground mt-1">Applications will appear here as candidates apply</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Recent Applications
        </CardTitle>
        <CardDescription>Latest candidate applications</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {applications.map((app) => (
            <div 
              key={app.id} 
              className="flex items-start gap-3 p-3 rounded-lg bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border border-border/50 hover:border-primary/30 transition-all"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm font-medium truncate">
                    {candidateNames[app.user_id || ''] || 'Candidate'}
                  </p>
                  <Badge variant="secondary" className="text-xs whitespace-nowrap">
                    {formatDistanceToNow(new Date(app.applied_at), { addSuffix: true })}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate mb-2">{app.position}</p>
                <div className="flex items-center gap-2">
                  <Badge className={`text-xs ${getStageColor(getCurrentStage(app))}`}>
                    {getCurrentStage(app)}
                  </Badge>
                  {app.match_score && (
                    <Badge variant="outline" className="text-xs">
                      {Math.round(app.match_score)}% match
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" asChild>
                  <Link to={`/applications/${app.id}`}>
                    <Eye className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
        <Button className="w-full mt-4" variant="outline" asChild>
          <Link to="/partner-dashboard">View All Applications</Link>
        </Button>
      </CardContent>
    </Card>
  );
};
