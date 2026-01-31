import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Sparkles, 
  MapPin, 
  Briefcase,
  TrendingUp,
  X,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

interface JobMatch {
  id: string;
  job_id: string;
  overall_score: number;
  club_match_factors: {
    skill_overlap?: number;
    experience_match?: number;
    comp_proximity?: number;
    location_fit?: number;
  };
  job: {
    title: string;
    location: string;
    employment_type: string;
    company: {
      name: string;
    };
  };
}

export function JobRecommendations({ userId }: { userId: string }) {
  const [recommendations, setRecommendations] = useState<JobMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRecommendations();
  }, [userId]);

  const fetchRecommendations = async () => {
    try {
      // First, get match scores for this user
      const { data: matches, error: matchError } = await supabase
        .from('match_scores')
        .select('id, job_id, overall_score, club_match_factors')
        .eq('user_id', userId)
        .gte('overall_score', 70)
        .order('overall_score', { ascending: false })
        .limit(5);

      if (matchError) {
        logger.warn('Could not fetch match scores', { componentName: 'JobRecommendations', error: matchError.message });
        setRecommendations([]);
        setLoading(false);
        return;
      }

      if (!matches || matches.length === 0) {
        setRecommendations([]);
        setLoading(false);
        return;
      }

      // Filter job_ids that look like UUIDs (for proper job lookups)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const uuidJobIds = matches
        .filter(m => uuidRegex.test(m.job_id))
        .map(m => m.job_id);

      // Fetch job details for UUID-based job_ids
      let jobsMap: Record<string, { title: string; location: string; employment_type: string; company_name: string }> = {};
      
      if (uuidJobIds.length > 0) {
        const { data: jobs } = await supabase
          .from('jobs')
          .select('id, title, location, employment_type, companies:company_id(name)')
          .in('id', uuidJobIds);

        if (jobs) {
          jobs.forEach(job => {
            jobsMap[job.id] = {
              title: job.title || 'Unknown Position',
              location: job.location || 'Remote',
              employment_type: job.employment_type || 'Full-time',
              company_name: (job.companies as any)?.name || 'Unknown Company'
            };
          });
        }
      }

      // Format results, handling both UUID and text-based job_ids
      // CRITICAL: Filter out orphaned records where job was deleted
      const formatted = matches
        .map(match => {
          const isUuid = uuidRegex.test(match.job_id);
          const jobInfo = isUuid ? jobsMap[match.job_id] : null;
          
          // Skip orphaned records: UUID job_id but job doesn't exist (was deleted)
          if (isUuid && !jobInfo) {
            return null;
          }
          
          // For text-based job_ids (legacy format: "Company-Title"), parse them
          let parsedTitle = 'Unknown Position';
          let parsedCompany = 'Unknown Company';
          
          if (!isUuid && match.job_id.includes('-')) {
            const parts = match.job_id.split('-');
            parsedCompany = parts[0] || 'Unknown Company';
            parsedTitle = parts.slice(1).join('-') || 'Unknown Position';
          }

          return {
            id: match.id,
            job_id: match.job_id,
            overall_score: match.overall_score || 0,
            club_match_factors: (match.club_match_factors as any) || {},
            job: {
              title: jobInfo?.title || parsedTitle,
              location: jobInfo?.location || 'Remote',
              employment_type: jobInfo?.employment_type || 'Full-time',
              company: {
                name: jobInfo?.company_name || parsedCompany
              }
            }
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

      setRecommendations(formatted);
    } catch (error) {
      logger.warn('Error fetching recommendations', { componentName: 'JobRecommendations', error });
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = async (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const { error } = await supabase
        .from('dismissed_jobs')
        .insert({
          user_id: userId,
          job_id: jobId,
          reason: 'not_interested'
        });

      if (error) throw error;

      setRecommendations(prev => prev.filter(rec => rec.job_id !== jobId));
      toast.success("Job removed from recommendations");
    } catch (error) {
      console.error('Error dismissing job:', error);
      toast.error("Failed to dismiss job");
    }
  };

  const getMatchReasons = (factors: JobMatch['club_match_factors']) => {
    const reasons: string[] = [];
    
    if (factors.skill_overlap && factors.skill_overlap > 75) {
      reasons.push(`${Math.round(factors.skill_overlap)}% skills match`);
    }
    if (factors.experience_match && factors.experience_match > 70) {
      reasons.push('Experience aligned');
    }
    if (factors.comp_proximity && factors.comp_proximity > 80) {
      reasons.push('Salary in range');
    }
    if (factors.location_fit && factors.location_fit > 90) {
      reasons.push('Location match');
    }
    
    return reasons.length > 0 ? reasons : ['Good overall fit'];
  };

  if (loading) {
    return (
      <Card className="border-border/50 shadow-sm hover:shadow-md transition-all">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (recommendations.length === 0) {
    return (
      <Card className="border-border/50 shadow-sm hover:shadow-md transition-all">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-black uppercase">
            <div className="w-1 h-6 bg-foreground"></div>
            <Sparkles className="w-5 h-5" />
            Top Matches
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-4">
            <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              Complete your profile to see personalized recommendations
            </p>
            <Button onClick={() => navigate('/profile')} variant="default">
              Complete Profile
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 shadow-sm hover:shadow-md transition-all">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-black uppercase">
          <div className="w-1 h-6 bg-foreground"></div>
          <Sparkles className="w-5 h-5" />
          Top Matches
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {recommendations.map((rec) => (
          <div
            key={rec.id}
            className="group relative p-4 rounded-lg bg-background/30 border border-border/30 hover:bg-background/40 transition-all cursor-pointer"
            onClick={() => navigate(`/jobs/${rec.job_id}`)}
          >
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => handleDismiss(rec.job_id, e)}
            >
              <X className="w-4 h-4" />
            </Button>

            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex-1 min-w-0">
                <h4 className="font-bold truncate mb-1">{rec.job.title}</h4>
                <p className="text-sm text-muted-foreground truncate">
                  {rec.job.company.name}
                </p>
              </div>
              <Badge className="shrink-0 bg-success/10 text-success border-success/30">
                {Math.round(rec.overall_score)}% Match
              </Badge>
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {rec.job.location}
              </span>
              <span className="flex items-center gap-1">
                <Briefcase className="w-3 h-3" />
                {rec.job.employment_type}
              </span>
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
              {getMatchReasons(rec.club_match_factors).map((reason, idx) => (
                <Badge 
                  key={idx} 
                  variant="outline" 
                  className="text-xs bg-background/50"
                >
                  {reason}
                </Badge>
              ))}
            </div>

            <div className="flex items-center gap-2 text-xs text-primary">
              <span className="font-medium">View Details</span>
              <ExternalLink className="w-3 h-3" />
            </div>
          </div>
        ))}

        <Button
          variant="outline"
          className="w-full"
          onClick={() => navigate('/jobs')}
        >
          See All Matches
        </Button>
      </CardContent>
    </Card>
  );
}
