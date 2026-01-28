import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Bookmark, MapPin, Building2, Trash2, ExternalLink, Briefcase } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { useEffect } from "react";

interface SavedJob {
  id: string;
  job_id: string;
  created_at: string;
  job?: {
    id: string;
    title: string;
    location: string;
    employment_type: string;
    company?: {
      name: string;
      logo_url: string | null;
    };
  };
}

export function SavedJobsWidget() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: savedJobs, isLoading } = useQuery({
    queryKey: ['saved-jobs-widget', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('saved_jobs')
        .select(`
          id,
          job_id,
          created_at,
          job:jobs(
            id,
            title,
            location,
            employment_type,
            company:companies(name, logo_url)
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error fetching saved jobs:', error);
        return [];
      }

      return (data || []) as SavedJob[];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Real-time subscription for saved_jobs changes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('saved-jobs-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'saved_jobs',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Invalidate query to refetch data
          queryClient.invalidateQueries({ queryKey: ['saved-jobs-widget', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const removeMutation = useMutation({
    mutationFn: async (jobId: string) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('saved_jobs')
        .delete()
        .eq('user_id', user.id)
        .eq('job_id', jobId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-jobs-widget'] });
      toast.success('Job removed from saved');
    },
    onError: () => {
      toast.error('Failed to remove job');
    },
  });

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bookmark className="h-4 w-4 text-primary" aria-hidden="true" />
            Saved Jobs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3" role="status" aria-label="Loading saved jobs">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!savedJobs?.length) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bookmark className="h-4 w-4 text-primary" aria-hidden="true" />
            Saved Jobs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Briefcase className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" aria-hidden="true" />
            <p className="text-sm text-muted-foreground mb-3">
              No saved jobs yet
            </p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/jobs')}
              aria-label="Browse available jobs"
            >
              Browse Jobs
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card" role="region" aria-label="Saved jobs">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Bookmark className="h-4 w-4 text-primary" aria-hidden="true" />
            Saved Jobs
            <Badge variant="secondary" className="ml-1 text-xs">
              {savedJobs.length}
            </Badge>
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs"
            onClick={() => navigate('/jobs?filter=saved')}
            aria-label="View all saved jobs"
          >
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="space-y-3" role="list" aria-label="Your saved jobs">
          {savedJobs.map((saved) => (
            <li key={saved.id}>
              <div 
                className="group flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-1"
                onClick={() => navigate(`/jobs/${saved.job_id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(`/jobs/${saved.job_id}`);
                  }
                }}
                aria-label={`${saved.job?.title || 'Job'} at ${saved.job?.company?.name || 'Company'}. Saved ${formatDistanceToNow(new Date(saved.created_at), { addSuffix: true })}`}
              >
                {/* Company Logo */}
                <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center flex-shrink-0 border border-border/50">
                  {saved.job?.company?.logo_url ? (
                    <img 
                      src={saved.job.company.logo_url} 
                      alt="" 
                      className="w-8 h-8 object-contain rounded"
                      aria-hidden="true"
                    />
                  ) : (
                    <Building2 className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                  )}
                </div>

                {/* Job Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                    {saved.job?.title || 'Untitled Role'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {saved.job?.company?.name || 'Company'}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {saved.job?.location && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" aria-hidden="true" />
                        {saved.job.location}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      • Saved {formatDistanceToNow(new Date(saved.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/jobs/${saved.job_id}`);
                    }}
                    aria-label={`Open ${saved.job?.title || 'job'} details`}
                  >
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeMutation.mutate(saved.job_id);
                    }}
                    aria-label={`Remove ${saved.job?.title || 'job'} from saved`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
