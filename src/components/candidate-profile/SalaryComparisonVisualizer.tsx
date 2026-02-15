import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, AlertTriangle, Check } from "lucide-react";
import { candidateProfileTokens, getScoreColor } from "@/config/candidate-profile-tokens";
import { AssessmentBreakdown } from "@/hooks/useAssessmentScores";

interface SalaryComparisonVisualizerProps {
  candidate: any;
  job?: any | null;
  breakdown: AssessmentBreakdown | null;
}

function formatSalary(val: number): string {
  if (val >= 1000) return `€${Math.round(val / 1000)}K`;
  return `€${val}`;
}

export function SalaryComparisonVisualizer({ candidate, job, breakdown }: SalaryComparisonVisualizerProps) {
  const currentMin = candidate.current_salary_min;
  const currentMax = candidate.current_salary_max || currentMin;
  const desiredMin = candidate.desired_salary_min;
  const desiredMax = candidate.desired_salary_max || desiredMin;
  const jobMin = job?.salary_min;
  const jobMax = job?.salary_max || jobMin;

  const hasCurrent = currentMin != null;
  const hasDesired = desiredMin != null;
  const hasJob = jobMin != null;

  if (!hasCurrent && !hasDesired) return null;

  // Find global min/max for the bar scale
  const allValues = [
    ...(hasCurrent ? [currentMin, currentMax] : []),
    ...(hasDesired ? [desiredMin, desiredMax] : []),
    ...(hasJob ? [jobMin, jobMax] : []),
  ].filter(Boolean) as number[];

  const globalMin = Math.min(...allValues) * 0.85;
  const globalMax = Math.max(...allValues) * 1.1;
  const range = globalMax - globalMin || 1;

  const toPercent = (val: number) => ((val - globalMin) / range) * 100;

  const salaryDim = breakdown?.salary_match;
  const salaryScore = salaryDim && salaryDim.confidence > 0.1 ? salaryDim.score : null;

  // Compute salary jump
  const jumpPct = hasCurrent && hasDesired
    ? Math.round(((((desiredMin + desiredMax) / 2) - ((currentMin + currentMax!) / 2)) / ((currentMin + currentMax!) / 2)) * 100)
    : null;

  // Check overlap between desired and job
  const hasOverlap = hasDesired && hasJob && desiredMin <= jobMax && desiredMax >= jobMin;

  const renderBar = (min: number, max: number, label: string, colorClass: string) => {
    const left = toPercent(min);
    const width = Math.max(2, toPercent(max) - toPercent(min));
    return (
      <div className="relative h-6 group">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full h-1.5 bg-muted/30 rounded-full" />
        </div>
        <div
          className={`absolute h-3 rounded-full ${colorClass} top-1/2 -translate-y-1/2 transition-all`}
          style={{ left: `${left}%`, width: `${width}%`, minWidth: '8px' }}
        />
        <div className="flex justify-between items-center h-full relative z-10 px-0.5">
          <span className="text-[10px] text-muted-foreground">{label}</span>
          <span className="text-[10px] font-medium">
            {formatSalary(min)}{max !== min ? `–${formatSalary(max)}` : ''}
          </span>
        </div>
      </div>
    );
  };

  return (
    <Card className={candidateProfileTokens.glass.card}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <DollarSign className="w-4 h-4" />
          Salary Comparison
          {salaryScore != null && (
            <Badge variant="outline" className="text-xs ml-auto font-normal" style={{ color: getScoreColor(salaryScore).bg }}>
              {salaryScore}/100
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {hasCurrent && renderBar(currentMin, currentMax!, 'Current', 'bg-muted-foreground/40')}
        {hasDesired && renderBar(desiredMin, desiredMax!, 'Desired', 'bg-primary/70')}
        {hasJob && renderBar(jobMin, jobMax!, 'Job budget', 'bg-chart-2/70')}

        {/* Insights */}
        <div className="pt-2 border-t border-border/50 space-y-1.5">
          {jumpPct != null && (
            <div className="flex items-center gap-1.5 text-xs">
              <TrendingUp className="w-3 h-3 text-muted-foreground" />
              <span className="text-muted-foreground">
                {jumpPct > 0 ? `+${jumpPct}%` : `${jumpPct}%`} salary change desired
              </span>
              {jumpPct > 30 && (
                <Badge variant="outline" className="text-[10px] bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                  Significant jump
                </Badge>
              )}
            </div>
          )}

          {hasJob && hasDesired && (
            <div className="flex items-center gap-1.5 text-xs">
              {hasOverlap ? (
                <>
                  <Check className="w-3 h-3 text-green-500" />
                  <span className="text-green-500">Ranges overlap — alignment possible</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3 h-3 text-orange-500" />
                  <span className="text-orange-500">
                    Gap of {formatSalary(Math.abs(desiredMin - jobMax!))}
                  </span>
                </>
              )}
            </div>
          )}

          {salaryDim?.details && (
            <p className="text-[10px] text-muted-foreground mt-1">{salaryDim.details}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
