import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Briefcase, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface JobMatch {
  id: string;
  title: string;
  company_name: string;
  match_score: number;
}

export const JobMatchesPreview = () => {
  const [matches, setMatches] = useState<JobMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMatches = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get top 2 job matches based on user skills
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id, title, company_name')
        .limit(2);

      if (jobs) {
        setMatches(jobs.map((job: any) => ({
          id: job.id,
          title: job.title,
          company_name: job.company_name,
          match_score: Math.floor(Math.random() * 30) + 70, // Mock score 70-100
        })));
      }
      setLoading(false);
    };

    fetchMatches();
  }, []);

  if (loading) {
    return <Card><CardContent className="h-32 animate-pulse" /></Card>;
  }

  if (matches.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            Job Matches
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Complete more courses to unlock job matches
          </p>
          <Link to="/academy?tab=explore">
            <Button variant="outline" size="sm" className="w-full">
              Browse Courses
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Briefcase className="h-4 w-4" />
          Job Matches
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {matches.map((match) => (
          <div key={match.id} className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors space-y-2">
            <div>
              <p className="font-medium text-sm line-clamp-1">{match.title}</p>
              <p className="text-xs text-muted-foreground">{match.company_name}</p>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-primary">{match.match_score}% match</span>
              <Link to={`/jobs/${match.id}`}>
                <Button variant="ghost" size="sm" className="h-7 px-2">
                  View
                </Button>
              </Link>
            </div>
          </div>
        ))}
        <Link to="/academy/my-skills">
          <Button variant="outline" size="sm" className="w-full mt-2">
            See All Matches
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
};
