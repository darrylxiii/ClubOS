import { CheckCircle2, XCircle, AlertCircle, Zap, Clock, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface MatchScoreBreakdownProps {
  overallScore: number;
  requiredCriteriaMet: Array<{ criterion: string; met: boolean }>;
  requiredCriteriaTotal: number;
  preferredCriteriaMet: Array<{ criterion: string; met: boolean }>;
  preferredCriteriaTotal: number;
  clubMatchFactors: Array<{ factor: string; score: number; description: string }>;
  clubMatchScore: number;
  additionalFactors: Array<{ factor: string; impact: string; description: string }>;
  gaps: Array<{ gap: string; impact: string }>;
  hardStops: Array<{ issue: string; description: string }>;
  quickWins: Array<{ action: string; timeframe: string; impact: string }>;
  longerTermActions: Array<{ action: string; timeframe: string; impact: string }>;
}

export const MatchScoreBreakdown = ({
  overallScore,
  requiredCriteriaMet,
  requiredCriteriaTotal,
  preferredCriteriaMet,
  preferredCriteriaTotal,
  clubMatchFactors,
  clubMatchScore,
  additionalFactors,
  gaps,
  hardStops,
  quickWins,
  longerTermActions,
}: MatchScoreBreakdownProps) => {
  const requiredMetCount = requiredCriteriaMet.filter(c => c.met).length;
  const preferredMetCount = preferredCriteriaMet.filter(c => c.met).length;
  const requiredPercentage = requiredCriteriaTotal > 0 ? Math.round((requiredMetCount / requiredCriteriaTotal) * 100) : 0;
  const preferredPercentage = preferredCriteriaTotal > 0 ? Math.round((preferredMetCount / preferredCriteriaTotal) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <div className="text-center">
        <div className="text-5xl font-bold mb-2">{overallScore}%</div>
        <p className="text-sm text-muted-foreground">Overall Match Score</p>
      </div>

      <Separator />

      {/* Required Criteria */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-muted-foreground" />
            Required Criteria
          </h3>
          <span className="text-sm font-medium">{requiredMetCount}/{requiredCriteriaTotal} ({requiredPercentage}%)</span>
        </div>
        <Progress value={requiredPercentage} className="h-2" />
        <div className="space-y-2">
          {requiredCriteriaMet.map((criterion, idx) => (
            <div key={idx} className="flex items-start gap-2 text-sm">
              {criterion.met ? (
                <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              )}
              <span className={criterion.met ? "" : "text-muted-foreground"}>{criterion.criterion}</span>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Preferred Criteria */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-muted-foreground" />
            Preferred Criteria
          </h3>
          <span className="text-sm font-medium">{preferredMetCount}/{preferredCriteriaTotal} ({preferredPercentage}%)</span>
        </div>
        <Progress value={preferredPercentage} className="h-2" />
        <div className="space-y-2">
          {preferredCriteriaMet.map((criterion, idx) => (
            <div key={idx} className="flex items-start gap-2 text-sm">
              {criterion.met ? (
                <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              )}
              <span className={criterion.met ? "" : "text-muted-foreground"}>{criterion.criterion}</span>
            </div>
          ))}
        </div>
      </div>

      {clubMatchFactors.length > 0 && (
        <>
          <Separator />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Zap className="w-5 h-5 text-accent" />
                Club Match
              </h3>
              <span className="text-sm font-medium">{clubMatchScore}%</span>
            </div>
            <div className="space-y-2">
              {clubMatchFactors.map((factor, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{factor.factor}</span>
                    <span className="text-xs text-muted-foreground">{factor.score}/10</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{factor.description}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {gaps.length > 0 && (
        <>
          <Separator />
          <div className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-destructive">
              <XCircle className="w-5 h-5" />
              Gaps
            </h3>
            <div className="space-y-2">
              {gaps.map((gap, idx) => (
                <div key={idx} className="flex items-start gap-2 text-sm">
                  <span className="shrink-0">•</span>
                  <div>
                    <span className="font-medium">{gap.gap}</span>
                    <span className="text-muted-foreground ml-2">({gap.impact})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {hardStops.length > 0 && (
        <>
          <Separator />
          <div className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              Hard Stops
            </h3>
            <div className="rounded-lg bg-destructive/10 p-4 space-y-3">
              {hardStops.map((stop, idx) => (
                <div key={idx} className="space-y-1">
                  <p className="text-sm font-medium text-destructive">{stop.issue}</p>
                  <p className="text-xs text-muted-foreground">{stop.description}</p>
                </div>
              ))}
              <p className="text-xs text-muted-foreground italic">
                Note: These are firm requirements that cannot be waived
              </p>
            </div>
          </div>
        </>
      )}

      {quickWins.length > 0 && (
        <>
          <Separator />
          <div className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Quick Wins
            </h3>
            <div className="space-y-3">
              {quickWins.map((win, idx) => (
                <div key={idx} className="rounded-lg bg-muted/20 p-3 space-y-2">
                  <p className="text-sm font-medium">{win.action}</p>
                  <div className="flex items-center gap-3 text-xs">
                    <Badge variant="secondary" className="gap-1">
                      <Clock className="w-3 h-3" />
                      {win.timeframe}
                    </Badge>
                    <span className="font-medium">{win.impact}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {longerTermActions.length > 0 && (
        <>
          <Separator />
          <div className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Longer-term Actions
            </h3>
            <div className="space-y-3">
              {longerTermActions.map((action, idx) => (
                <div key={idx} className="rounded-lg bg-muted/20 p-3 space-y-2">
                  <p className="text-sm font-medium">{action.action}</p>
                  <div className="flex items-center gap-3 text-xs">
                    <Badge variant="outline" className="gap-1">
                      <Clock className="w-3 h-3" />
                      {action.timeframe}
                    </Badge>
                    <span className="font-medium">{action.impact}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};