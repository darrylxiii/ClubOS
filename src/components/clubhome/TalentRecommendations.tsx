import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Briefcase, MapPin, Euro } from "lucide-react";
import { Link } from "react-router-dom";

interface TalentMatch {
  userId: string;
  userName: string;
  currentTitle: string;
  location: string | null | undefined;
  yearsOfExperience: number | null | undefined;
  topSkills: string[];
  matchScore: number;
  matchFactors: string[];
  jobId: string;
  jobTitle: string;
  desiredSalaryMin: number | null | undefined;
  desiredSalaryMax: number | null | undefined;
}

interface TalentRecommendationsProps {
  companyId: string;
}

export const TalentRecommendations = ({ companyId }: TalentRecommendationsProps) => {
  const [talents, setTalents] = useState<TalentMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTalentRecommendations();
  }, [companyId]);

  const fetchTalentRecommendations = async () => {
    try {
      // Get company's active jobs
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id, title, status')
        .eq('company_id', companyId)
        .eq('status', 'published')
        .limit(5);

      if (!jobs || jobs.length === 0) {
        setLoading(false);
        return;
      }

      const jobIds = jobs.map(j => j.id);

      // Fetch top matches for these jobs
      const { data: matches, error } = await supabase
        .from('match_scores')
        .select(`
          user_id,
          job_id,
          overall_score,
          club_match_factors
        `)
        .in('job_id', jobIds)
        .gte('overall_score', 70)
        .order('overall_score', { ascending: false })
        .limit(5);

      if (error) throw error;

      if (matches && matches.length > 0) {
        // Fetch user profiles
        const userIds = matches.map(m => m.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, current_title, location, years_of_experience, skills, desired_salary_min, desired_salary_max')
          .in('id', userIds);

        if (profiles) {
          const talentMatches: TalentMatch[] = matches.map(match => {
            const profile = profiles.find(p => p.id === match.user_id);
            const job = jobs.find(j => j.id === match.job_id);
            const matchFactors = match.club_match_factors ? 
              Object.keys(match.club_match_factors as any).filter((key: string) => {
                const factors = match.club_match_factors as any;
                return factors[key] === true || factors[key] > 0.8;
              }).slice(0, 3) : [];

            return {
              userId: match.user_id,
              userName: profile?.full_name || 'Anonymous',
              currentTitle: profile?.current_title || 'Professional',
              location: profile?.location,
              yearsOfExperience: profile?.years_of_experience,
              topSkills: profile?.skills || [],
              matchScore: Math.round(match.overall_score),
              matchFactors: matchFactors.map(f => f.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())),
              jobId: match.job_id,
              jobTitle: job?.title || 'Position',
              desiredSalaryMin: profile?.desired_salary_min,
              desiredSalaryMax: profile?.desired_salary_max
            };
          });

          setTalents(talentMatches);
        }
      }
    } catch (error) {
      console.error('Error fetching talent recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMatchColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 70) return 'text-blue-500';
    return 'text-yellow-500';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Recommended Talent
          </CardTitle>
          <CardDescription>Top candidates matching your open roles</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (talents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Recommended Talent
          </CardTitle>
          <CardDescription>Top candidates matching your open roles</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">No recommendations yet</p>
            <p className="text-xs text-muted-foreground mt-1">Recommendations will appear when you have active job postings</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Recommended Talent
        </CardTitle>
        <CardDescription>Top candidates matching your open roles</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {talents.map((talent) => (
            <div 
              key={`${talent.userId}-${talent.jobId}`}
              className="p-4 rounded-lg bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border border-border/50 hover:border-primary/30 transition-all"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold mb-1 truncate">{talent.userName}</h4>
                  <p className="text-xs text-muted-foreground truncate">{talent.currentTitle}</p>
                </div>
                <Badge className={`text-sm font-bold ${getMatchColor(talent.matchScore)}`} variant="outline">
                  {talent.matchScore}% Match
                </Badge>
              </div>

              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Briefcase className="h-3 w-3" />
                  <span>For: {talent.jobTitle}</span>
                </div>
                {talent.location && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span>{talent.location}</span>
                  </div>
                )}
                {(talent.desiredSalaryMin || talent.desiredSalaryMax) && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Euro className="h-3 w-3" />
                    <span>
                      €{talent.desiredSalaryMin?.toLocaleString() || '?'}
                      {talent.desiredSalaryMax ? ` - €${talent.desiredSalaryMax.toLocaleString()}` : '+'}
                    </span>
                  </div>
                )}
              </div>

              {talent.topSkills.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {talent.topSkills.slice(0, 4).map((skill, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              )}

              {talent.matchFactors.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-muted-foreground mb-1">Why matched:</p>
                  <div className="flex flex-wrap gap-1">
                    {talent.matchFactors.map((factor, idx) => (
                      <Badge key={idx} className="text-xs bg-primary/10 text-primary border-primary/20">
                        {factor}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <Button size="sm" className="w-full" variant="outline" asChild>
                <Link to={`/candidate/${talent.userId}`}>
                  Review Full Profile
                </Link>
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
