import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Brain, AlertTriangle, Sparkles, Target, MessageSquare, ShieldCheck } from "lucide-react";

interface Props {
  brief: any;
  skillVerification: any;
}

export const CandidateBriefCard = ({ brief, skillVerification }: Props) => {
  if (!brief) {
    return (
      <Card className="bg-card/90 backdrop-blur-xl border border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="w-4 h-4" />
            Candidate Intelligence Brief
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Brief not yet generated. Run Deep Enrich to create.</p>
        </CardContent>
      </Card>
    );
  }

  const confidencePercent = Math.round((brief.overall_confidence || 0) * 100);
  const confidenceColor = confidencePercent >= 75
    ? 'text-green-500'
    : confidencePercent >= 50
      ? 'text-yellow-500'
      : 'text-red-500';

  return (
    <Card className="bg-card/90 backdrop-blur-xl border border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="w-4 h-4" />
            Intelligence Brief
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-bold tabular-nums ${confidenceColor}`}>
              {confidencePercent}%
            </span>
            <span className="text-[10px] text-muted-foreground">confidence</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Executive Summary */}
        {brief.executive_summary && (
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
            <p className="text-sm leading-relaxed">{brief.executive_summary}</p>
          </div>
        )}

        {/* Differentiators */}
        {brief.differentiators?.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Differentiators</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {brief.differentiators.map((d: string, i: number) => (
                <Badge key={i} className="bg-primary/10 text-primary border-primary/20 text-xs">
                  {d}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Risk Factors */}
        {brief.risk_factors?.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Risk Factors</p>
            </div>
            <div className="space-y-1">
              {brief.risk_factors.map((r: string, i: number) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-yellow-500 mt-0.5">•</span>
                  <span className="text-muted-foreground">{r}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Interview Angles */}
        {brief.interview_angles?.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Interview Angles</p>
            </div>
            <div className="space-y-1">
              {brief.interview_angles.map((a: string, i: number) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-blue-500 mt-0.5">{i + 1}.</span>
                  <span>{a}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Skill Verification */}
        {skillVerification && Object.keys(skillVerification).length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Skill Verification</p>
            </div>
            <div className="space-y-2">
              {Object.entries(skillVerification).slice(0, 10).map(([skill, data]: [string, any]) => (
                <div key={skill}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-medium">{skill}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {Math.round((data.confidence || 0) * 100)}% · {data.evidence_count || 0} evidence
                    </span>
                  </div>
                  <Progress value={(data.confidence || 0) * 100} className="h-1.5" />
                  {data.evidence_summary && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">{data.evidence_summary}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Talent Signals */}
        {brief.talent_signals?.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Target className="w-3.5 h-3.5 text-emerald-500" />
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Talent Signals</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {brief.talent_signals.map((s: string, i: number) => (
                <Badge key={i} variant="outline" className="text-xs border-emerald-500/20 text-emerald-600">
                  {s}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border/30">
          <span className="text-[10px] text-muted-foreground">Powered by QUIN</span>
          {brief.generated_at && (
            <span className="text-[10px] text-muted-foreground">
              {new Date(brief.generated_at).toLocaleDateString()}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
