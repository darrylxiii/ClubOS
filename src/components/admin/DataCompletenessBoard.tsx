import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';

export function DataCompletenessBoard() {
  const { data: completenessMetrics } = useQuery({
    queryKey: ['data-completeness-metrics'],
    queryFn: async () => {
      const { data: profiles } = await supabase
        .from('candidate_profiles')
        .select('id, profile_completeness, full_name, email, current_title, ai_summary')
        .limit(500);

      if (!profiles) return null;

      const avgCompleteness = profiles.reduce((sum, p) => sum + (p.profile_completeness || 0), 0) / profiles.length;
      const withAI = profiles.filter(p => p.ai_summary).length;
      const fullProfiles = profiles.filter(p => (p.profile_completeness || 0) >= 80).length;

      return {
        totalCandidates: profiles.length,
        avgCompleteness: Math.round(avgCompleteness),
        withAI,
        fullyComplete: fullProfiles,
        profiles,
      };
    },
  });

  const { data: skillDemand } = useQuery({
    queryKey: ['skill-demand'],
    queryFn: async () => {
      const { data } = await supabase.rpc('aggregate_skill_demand');
      return (data || []).slice(0, 10);
    },
  });

  if (!completenessMetrics) return null;

  const completenessPercent = completenessMetrics.avgCompleteness;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Data Completeness
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{completenessPercent}%</div>
            <Progress value={completenessPercent} className="mt-2 h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {completenessMetrics.fullyComplete}/{completenessMetrics.totalCandidates} fully populated
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              AI Enrichment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{completenessMetrics.withAI}</div>
            <p className="text-xs text-muted-foreground mt-2">
              {Math.round((completenessMetrics.withAI / completenessMetrics.totalCandidates) * 100)}% with AI summaries
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-warning" />
              Hottest Skills
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {skillDemand?.slice(0, 3).map((skill: any) => (
                <div key={skill.skill_name} className="flex justify-between text-xs">
                  <span>{skill.skill_name}</span>
                  <Badge variant="secondary">{skill.job_count} roles</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Low Completeness Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Missing Data - Priority Fixes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {completenessMetrics.profiles
              ?.filter((p: any) => (p.profile_completeness || 0) < 50)
              .slice(0, 5)
              .map((p: any) => (
                <div key={p.id} className="text-xs border-l-2 border-warning pl-2 py-1">
                  <div className="font-medium">{p.full_name || 'Unknown'}</div>
                  <div className="text-muted-foreground">{p.current_title || 'No title'}</div>
                  <div className="mt-1">
                    <Progress value={p.profile_completeness || 0} className="h-1" />
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
