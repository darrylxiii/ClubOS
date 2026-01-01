import { memo, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { Briefcase, TrendingUp, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface JobMatch {
  id: string;
  title: string;
  company_name: string;
  match_percentage: number;
  skills_matched: number;
  skills_total: number;
  missing_skills: string[];
}

export const JobMatchesCard = memo(() => {
  const [matches, setMatches] = useState<JobMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get candidate skills
    // Get candidate skills - using type assertion for optional table
    let skillNames: string[] = [];
    try {
      const { data: candidateSkills } = await (supabase
        .from('candidate_skills' as 'profiles')
        .select('skill_name')
        .eq('candidate_id', user.id) as unknown as Promise<{ data: { skill_name: string }[] | null }>);
      skillNames = candidateSkills?.map((s) => s.skill_name) || [];
    } catch {
      // Table doesn't exist or error, continue with empty skills
    }

    // Get active jobs with required skills
    const { data: jobs } = await supabase
      .from('jobs')
      .select(`
        id,
        title,
        company_name,
        job_skills!inner (
          skill_name,
          importance
        )
      `)
      .eq('status', 'open')
      .limit(5);

    if (jobs) {
      const matchedJobs = jobs.map((job: any) => {
        const jobSkills = job.job_skills || [];
        const requiredSkills = jobSkills.filter((s: any) => 
          s.importance === 'required' || s.importance === 'preferred'
        );
        
        const matchedSkills = requiredSkills.filter((s: any) => 
          skillNames.includes(s.skill_name)
        );

        const missingSkills = requiredSkills
          .filter((s: any) => !skillNames.includes(s.skill_name))
          .map((s: any) => s.skill_name);

        const matchPercentage = requiredSkills.length > 0
          ? Math.round((matchedSkills.length / requiredSkills.length) * 100)
          : 0;

        return {
          id: job.id,
          title: job.title,
          company_name: job.company_name,
          match_percentage: matchPercentage,
          skills_matched: matchedSkills.length,
          skills_total: requiredSkills.length,
          missing_skills: missingSkills.slice(0, 3),
        };
      })
      .filter(j => j.match_percentage >= 60)
      .sort((a, b) => b.match_percentage - a.match_percentage)
      .slice(0, 3);

      setMatches(matchedJobs);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-6 bg-muted rounded w-1/3" />
          <div className="h-20 bg-muted rounded" />
        </div>
      </Card>
    );
  }

  if (matches.length === 0) return null;

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Briefcase className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold">Jobs Matching Your Skills</h3>
          <p className="text-sm text-muted-foreground">
            {matches.length} {matches.length === 1 ? 'opportunity' : 'opportunities'} waiting
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {matches.map((match) => (
          <div
            key={match.id}
            className="p-4 rounded-lg border bg-card hover:bg-accent transition-colors cursor-pointer"
            onClick={() => navigate(`/jobs/${match.id}`)}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="font-medium">{match.title}</h4>
                <p className="text-sm text-muted-foreground">{match.company_name}</p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="font-semibold">{match.match_percentage}%</span>
              </div>
            </div>

            <Progress value={match.match_percentage} className="h-2 mb-3" />

            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {match.skills_matched}/{match.skills_total} required skills
              </span>
              {match.missing_skills.length > 0 && (
                <span className="text-amber-600">
                  +{match.missing_skills.length} to learn
                </span>
              )}
            </div>

            {match.missing_skills.length > 0 && (
              <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
                Missing: {match.missing_skills.join(', ')}
              </div>
            )}
          </div>
        ))}
      </div>

      <Button variant="outline" className="w-full" onClick={() => navigate('/jobs')}>
        View All Jobs
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </Card>
  );
});

JobMatchesCard.displayName = 'JobMatchesCard';
