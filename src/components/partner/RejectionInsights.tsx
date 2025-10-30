import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, Brain, AlertCircle, Target } from "lucide-react";

interface Props {
  candidates: any[];
  stages: any[];
}

const REJECTION_LABELS: { [key: string]: string } = {
  'skills_gap': 'Skills Gap',
  'experience_junior': 'Too Junior',
  'experience_senior': 'Too Senior',
  'salary_high': 'Salary Too High',
  'location': 'Location Mismatch',
  'culture_fit': 'Culture Fit',
  'communication': 'Communication',
  'other': 'Other',
};

export function RejectionInsights({ candidates, stages }: Props) {
  if (candidates.length === 0) {
    return null;
  }

  // Calculate top rejection reasons
  const reasonCounts: { [key: string]: number } = {};
  candidates.forEach(c => {
    if (c.rejection_reason) {
      reasonCounts[c.rejection_reason] = (reasonCounts[c.rejection_reason] || 0) + 1;
    }
  });

  const topReasons = Object.entries(reasonCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([reason, count]) => ({
      reason: REJECTION_LABELS[reason] || reason,
      count,
      percentage: Math.round((count / candidates.length) * 100)
    }));

  // Calculate average stage before rejection
  const avgStage = candidates.reduce((acc, c) => acc + (c.current_stage_index || 0), 0) / candidates.length;
  const avgStageName = stages[Math.round(avgStage)]?.name || 'Unknown';

  // Find most common skill gaps
  const skillGaps: { [key: string]: number } = {};
  candidates.forEach(c => {
    if (c.skills_mismatch && Array.isArray(c.skills_mismatch)) {
      c.skills_mismatch.forEach((skill: string) => {
        skillGaps[skill] = (skillGaps[skill] || 0) + 1;
      });
    }
  });

  const topSkillGaps = Object.entries(skillGaps)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([skill, count]) => ({ skill, count }));

  // Calculate late-stage rejections (rejected after 50% of pipeline)
  const lateStageRejections = candidates.filter(
    c => c.current_stage_index >= stages.length / 2
  ).length;

  return (
    <div className="space-y-4">
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            AI Learning Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Top Rejection Reasons */}
          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <TrendingDown className="w-4 h-4" />
              Top Rejection Patterns
            </h4>
            <div className="space-y-2">
              {topReasons.map(({ reason, count, percentage }) => (
                <div key={reason} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{reason}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {count} candidate{count !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-12 text-right">{percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase">Average Rejection Stage</p>
              <p className="text-2xl font-bold">{avgStageName}</p>
              <p className="text-xs text-muted-foreground">Stage {Math.round(avgStage) + 1} of {stages.length}</p>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase">Late-Stage Rejections</p>
              <p className="text-2xl font-bold">{lateStageRejections}</p>
              <p className="text-xs text-muted-foreground">
                {Math.round((lateStageRejections / candidates.length) * 100)}% rejected in final stages
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase">Total Rejections</p>
              <p className="text-2xl font-bold">{candidates.length}</p>
              <p className="text-xs text-muted-foreground">Across all pipeline stages</p>
            </div>
          </div>

          {/* Common Skill Gaps */}
          {topSkillGaps.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Most Common Skill Gaps
              </h4>
              <div className="flex flex-wrap gap-2">
                {topSkillGaps.map(({ skill, count }) => (
                  <Badge key={skill} variant="secondary" className="text-sm">
                    {skill} ({count})
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Learning Summary */}
          <div className="p-4 rounded-lg bg-muted/30 border border-border/30">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <div className="text-sm space-y-1">
                <p className="font-semibold">Partner Preference Pattern</p>
                <p className="text-muted-foreground">
                  This partner typically focuses on{' '}
                  <span className="font-medium text-foreground">
                    {topReasons[0]?.reason.toLowerCase()}
                  </span>
                  {topReasons.length > 1 && (
                    <>, followed by{' '}
                      <span className="font-medium text-foreground">
                      {topReasons[1]?.reason.toLowerCase()}
                    </span>
                  </>
                )}
                . Club AI can use this data to improve candidate matching and reduce early-stage rejections.
              </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
