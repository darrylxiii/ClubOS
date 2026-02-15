import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, AlertCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AssessmentBreakdown } from "@/hooks/useAssessmentScores";
import { candidateProfileTokens, getScoreColor } from "@/config/candidate-profile-tokens";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface EngagementTimelineProps {
  candidateId: string;
  breakdown: AssessmentBreakdown | null;
}

interface WeekBucket {
  label: string;
  count: number;
}

export function EngagementTimeline({ candidateId, breakdown }: EngagementTimelineProps) {
  const [weeklyData, setWeeklyData] = useState<WeekBucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [commCount, setCommCount] = useState(0);
  const [totalActivities, setTotalActivities] = useState(0);

  useEffect(() => {
    async function loadInteractions() {
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

      const [{ data: interactions }, { data: logs }, { data: comms }] = await Promise.all([
        supabase
          .from('candidate_interactions')
          .select('created_at')
          .eq('candidate_id', candidateId)
          .gte('created_at', ninetyDaysAgo)
          .order('created_at', { ascending: true }),
        supabase
          .from('candidate_application_logs')
          .select('created_at')
          .eq('candidate_profile_id', candidateId)
          .gte('created_at', ninetyDaysAgo)
          .order('created_at', { ascending: true }),
        supabase
          .from('unified_communications')
          .select('original_timestamp')
          .eq('entity_id', candidateId)
          .gte('original_timestamp', ninetyDaysAgo)
          .order('original_timestamp', { ascending: true }),
      ]);

      const allDates = [
        ...(interactions || []).map(i => new Date(i.created_at)),
        ...(logs || []).map(l => new Date(l.created_at)),
        ...(comms || []).map(c => new Date(c.original_timestamp)),
      ];

      setCommCount((comms || []).length);
      setTotalActivities(allDates.length);

      const buckets: WeekBucket[] = [];
      const now = Date.now();
      for (let w = 12; w >= 0; w--) {
        const weekStart = now - (w + 1) * 7 * 24 * 60 * 60 * 1000;
        const weekEnd = now - w * 7 * 24 * 60 * 60 * 1000;
        const count = allDates.filter(d => d.getTime() >= weekStart && d.getTime() < weekEnd).length;
        buckets.push({ label: `W-${w}`, count });
      }

      setWeeklyData(buckets);
      setLoading(false);
    }

    loadInteractions();
  }, [candidateId]);

  const engagementData = breakdown?.engagement;
  const hasBreakdownData = engagementData && engagementData.confidence > 0.1;
  const hasLocalData = totalActivities > 0;
  const hasAnyData = hasBreakdownData || hasLocalData;
  const maxCount = Math.max(1, ...weeklyData.map(w => w.count));

  // Compute a local engagement estimate when breakdown is unavailable
  const localScore = !hasBreakdownData && hasLocalData
    ? Math.min(100, totalActivities * 8)
    : null;

  const displayScore = hasBreakdownData ? engagementData.score : localScore;

  return (
    <Card className={candidateProfileTokens.glass.card}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Engagement
          {!hasBreakdownData && hasLocalData && (
            <Badge variant="outline" className="text-[10px] font-normal">Local estimate</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {hasAnyData ? (
          <>
            {/* Score */}
            {displayScore != null && (
              <div className="flex items-center gap-3">
                <div
                  className="text-3xl font-bold"
                  style={{ color: getScoreColor(displayScore).bg }}
                >
                  {displayScore}
                </div>
                <div className="text-xs text-muted-foreground">
                  {hasBreakdownData ? (
                    <p>{engagementData.details}</p>
                  ) : (
                    <p>{totalActivities} activities in 90 days</p>
                  )}
                </div>
              </div>
            )}

            {/* Data sources */}
            {hasBreakdownData && engagementData.sources.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {engagementData.sources.map((src) => (
                  <Badge key={src} variant="secondary" className="text-[10px]">
                    {src.replace(/_/g, ' ')}
                  </Badge>
                ))}
              </div>
            )}

            {/* Sparkline */}
            {loading ? (
              <Skeleton className="h-12 w-full" />
            ) : (
              <div className="pt-2 border-t border-border/50">
                <p className="text-[10px] text-muted-foreground mb-2">Activity (last 13 weeks)</p>
                <div className="flex items-end gap-0.5 h-10">
                  {weeklyData.map((week, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-sm bg-primary/60 transition-all hover:bg-primary"
                      style={{
                        height: `${Math.max(4, (week.count / maxCount) * 100)}%`,
                        opacity: week.count === 0 ? 0.15 : 1,
                      }}
                      title={`${week.label}: ${week.count} activities`}
                    />
                  ))}
                </div>
              </div>
            )}

            {commCount > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1">
                <Clock className="w-3 h-3" />
                {commCount} communications tracked
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-4">
            <AlertCircle className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No engagement data yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Engagement tracks interactions, communications, and platform activity
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
