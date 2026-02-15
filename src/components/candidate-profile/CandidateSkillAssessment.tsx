import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Target, RefreshCw, AlertCircle, TrendingUp, Users, DollarSign, MapPin, Briefcase, Activity, AlertTriangle, Sparkles } from "lucide-react";
import { useAssessmentScores, AssessmentDimension } from "@/hooks/useAssessmentScores";
import { useRecharts } from "@/hooks/useRecharts";
import { candidateProfileTokens, getScoreColor } from "@/config/candidate-profile-tokens";
import { SkillMatchBreakdown } from "./SkillMatchBreakdown";
import { CultureFitSignals } from "./CultureFitSignals";
import { EngagementTimeline } from "./EngagementTimeline";
import { AvailabilityNoticeCard } from "./AvailabilityNoticeCard";
import { SalaryComparisonVisualizer } from "./SalaryComparisonVisualizer";
import { CareerTrajectoryTimeline } from "./CareerTrajectoryTimeline";

interface CandidateSkillAssessmentProps {
  candidateId: string;
  candidate: any;
  jobId?: string | null;
  skills?: any[];
}

const DIMENSION_CONFIG = [
  { key: 'skills_match', label: 'Skills Match', icon: Target, color: 'hsl(var(--primary))' },
  { key: 'experience', label: 'Experience', icon: Briefcase, color: 'hsl(var(--chart-2))' },
  { key: 'engagement', label: 'Engagement', icon: Activity, color: 'hsl(var(--chart-3))' },
  { key: 'culture_fit', label: 'Culture Fit', icon: Users, color: 'hsl(var(--chart-4))' },
  { key: 'salary_match', label: 'Salary Match', icon: DollarSign, color: 'hsl(var(--chart-5))' },
  { key: 'location_match', label: 'Location', icon: MapPin, color: 'hsl(142, 76%, 36%)' },
] as const;

export function CandidateSkillAssessment({ candidateId, candidate, jobId, skills = [] }: CandidateSkillAssessmentProps) {
  const { breakdown, isLoading, isComputing, error, recompute } = useAssessmentScores(candidateId, jobId);
  const { recharts, isLoading: chartsLoading } = useRecharts();

  const renderConfidenceDots = (confidence: number) => {
    const dots = confidence > 0.6 ? 3 : confidence > 0.3 ? 2 : 1;
    return (
      <div className="flex gap-0.5" title={`${Math.round(confidence * 100)}% confidence`}>
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className={`w-1.5 h-1.5 rounded-full ${i <= dots ? 'bg-primary' : 'bg-muted-foreground/20'}`}
          />
        ))}
      </div>
    );
  };

  const renderDimensionCard = (dim: typeof DIMENSION_CONFIG[number]) => {
    const data: AssessmentDimension | null = breakdown?.[dim.key as keyof typeof breakdown] as AssessmentDimension | null;
    const hasData = data && data.confidence > 0.1;
    const score = hasData ? data.score : 0;
    const scoreColor = hasData ? getScoreColor(score) : null;
    const Icon = dim.icon;

    return (
      <TooltipProvider key={dim.key}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`${candidateProfileTokens.glass.card} rounded-xl p-3 transition-all hover:border-primary/30`}>
              <div className="flex items-center gap-2 mb-1">
                <Icon className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground truncate">{dim.label}</span>
                {hasData && renderConfidenceDots(data.confidence)}
              </div>
              {hasData ? (
                <div className="text-2xl font-bold" style={{ color: scoreColor?.bg }}>
                  {score}
                  <span className="text-xs font-normal text-muted-foreground">/100</span>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Needs data</span>
                </div>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <p className="font-medium">{dim.label}</p>
            {data?.details && <p className="text-xs text-muted-foreground mt-1">{data.details}</p>}
            {data?.sources && data.sources.length > 0 && (
              <p className="text-[10px] text-muted-foreground mt-1">
                Sources: {data.sources.join(', ')}
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const renderRadarChart = () => {
    if (chartsLoading || !recharts || !breakdown) {
      return <Skeleton className="w-full h-[220px]" />;
    }

    const { ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis } = recharts;

    const radarData = DIMENSION_CONFIG.map((dim) => {
      const data = breakdown[dim.key as keyof typeof breakdown] as AssessmentDimension | undefined;
      return {
        category: dim.label,
        value: data && data.confidence > 0.1 ? data.score : 0,
        confidence: data?.confidence || 0,
      };
    });

    return (
      <ResponsiveContainer width="100%" height={220}>
        <RadarChart data={radarData}>
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis
            dataKey="category"
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
          />
          <Radar
            dataKey="value"
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary))"
            fillOpacity={0.25}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    );
  };

  if (isLoading) {
    return (
      <Card className={candidateProfileTokens.glass.card}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-[220px] w-full" />
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const overallScore = breakdown?.overall_score || 0;
  const overallConfidence = breakdown?.overall_confidence || 0;
  const overallColor = getScoreColor(overallScore);

  return (
    <div className="space-y-4">
      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-sm">
          <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
          <span className="text-destructive/90 flex-1">{error}</span>
          <Button variant="ghost" size="sm" onClick={recompute} disabled={isComputing} className="text-xs h-7">
            <RefreshCw className={`w-3 h-3 mr-1 ${isComputing ? 'animate-spin' : ''}`} />
            Retry
          </Button>
        </div>
      )}

      {/* Main Assessment Card */}
      <Card className={candidateProfileTokens.glass.card}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Skill Assessment
              {breakdown && (
                <Badge variant="outline" className="ml-2 text-xs font-normal">
                  {overallConfidence > 0.6 ? 'High' : overallConfidence > 0.3 ? 'Medium' : 'Low'} confidence
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Powered by QUIN
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={recompute}
                disabled={isComputing}
                className="text-xs"
              >
                <RefreshCw className={`w-3 h-3 mr-1 ${isComputing ? 'animate-spin' : ''}`} />
                {isComputing ? 'Computing...' : 'Refresh'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr_280px] gap-6 items-start">
            {/* Overall Score */}
            <div className="text-center min-w-[80px]">
              <div className="text-5xl font-black" style={{ color: overallColor.bg }}>
                {breakdown ? overallScore : '—'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Overall</p>
            </div>

            {/* Dimension Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {DIMENSION_CONFIG.map(renderDimensionCard)}
            </div>

            {/* Radar Chart */}
            <div className="hidden lg:block">{renderRadarChart()}</div>
          </div>
        </CardContent>
      </Card>

      {/* Skill Match Breakdown */}
      <SkillMatchBreakdown
        candidateId={candidateId}
        candidate={candidate}
        jobId={jobId}
        breakdown={breakdown}
        skills={skills}
      />

      {/* Culture Fit + Engagement Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CultureFitSignals
          candidateId={candidateId}
          breakdown={breakdown}
        />
        <EngagementTimeline
          candidateId={candidateId}
          breakdown={breakdown}
        />
      </div>

      {/* New: Salary + Availability + Trajectory Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SalaryComparisonVisualizer
          candidate={candidate}
          breakdown={breakdown}
        />
        <AvailabilityNoticeCard
          candidate={candidate}
        />
        <CareerTrajectoryTimeline
          candidate={candidate}
        />
      </div>
    </div>
  );
}
