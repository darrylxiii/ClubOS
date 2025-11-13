import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, Clock, TrendingUp, History } from "lucide-react";
import { candidateProfileTokens } from "@/config/candidate-profile-tokens";

interface Props {
  application: any;
  onAdvance?: () => void;
  onDecline?: () => void;
  onViewHistory?: () => void;
}

const STAGE_ORDER = [
  'applied',
  'screening',
  'interview',
  'technical',
  'final',
  'offer',
  'hired'
];

const STAGE_LABELS: Record<string, string> = {
  'applied': 'Applied',
  'screening': 'Screening',
  'interview': 'Interview',
  'technical': 'Technical',
  'final': 'Final Round',
  'offer': 'Offer',
  'hired': 'Hired'
};

export const PipelineBreakdownCard = ({ application, onAdvance, onDecline, onViewHistory }: Props) => {
  if (!application) return null;

  const currentStage = application.stage?.toLowerCase() || 'applied';
  const currentIndex = STAGE_ORDER.findIndex(s => currentStage.includes(s)) || 0;
  const daysInStage = application.days_in_stage || 0;

  const getUrgencyColor = (days: number) => {
    if (days < 3) return 'text-green-500 bg-green-500/10 border-green-500/30';
    if (days < 7) return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30';
    if (days < 14) return 'text-orange-500 bg-orange-500/10 border-orange-500/30';
    return 'text-red-500 bg-red-500/10 border-red-500/30';
  };

  const getNextStage = () => {
    const nextIndex = currentIndex + 1;
    return nextIndex < STAGE_ORDER.length ? STAGE_LABELS[STAGE_ORDER[nextIndex]] : 'Hired';
  };

  return (
    <Card className={candidateProfileTokens.glass.card}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Pipeline Progress
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge className="text-base px-3 py-1.5 bg-primary/10 border-primary/30">
              {STAGE_LABELS[STAGE_ORDER[currentIndex]] || currentStage}
            </Badge>
            <Badge variant="outline" className={`${getUrgencyColor(daysInStage)}`}>
              <Clock className="w-3 h-3 mr-1" />
              {daysInStage} days in stage
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Horizontal Stage Timeline */}
        <div className="relative">
          <div className="flex items-center justify-between">
            {STAGE_ORDER.map((stage, idx) => {
              const isCompleted = idx < currentIndex;
              const isCurrent = idx === currentIndex;
              const isFuture = idx > currentIndex;

              return (
                <div key={stage} className="flex flex-col items-center gap-2 flex-1 relative">
                  {/* Connector Line */}
                  {idx < STAGE_ORDER.length - 1 && (
                    <div
                      className={`absolute top-5 left-1/2 w-full h-0.5 -z-10 ${
                        idx < currentIndex ? 'bg-green-500' : 'bg-border'
                      }`}
                    />
                  )}

                  {/* Stage Icon */}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      isCompleted
                        ? 'bg-green-500/20 border-2 border-green-500'
                        : isCurrent
                        ? 'bg-primary/20 border-2 border-primary ring-2 ring-primary/30 ring-offset-2'
                        : 'bg-muted border-2 border-muted-foreground/30'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : isCurrent ? (
                      <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground/30" />
                    )}
                  </div>

                  {/* Stage Name */}
                  <span
                    className={`text-xs font-medium text-center ${
                      isCurrent
                        ? 'text-foreground font-semibold'
                        : isCompleted
                        ? 'text-green-600'
                        : 'text-muted-foreground/50'
                    }`}
                  >
                    {STAGE_LABELS[stage]}
                  </span>

                  {/* Stage Date for completed */}
                  {isCompleted && application.stage_completed_at && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(application.stage_completed_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Actions for Current Stage */}
        <div className="flex items-center gap-2 pt-4 border-t">
          {onAdvance && (
            <Button onClick={onAdvance} size="sm">
              Advance to {getNextStage()}
            </Button>
          )}
          {onDecline && (
            <Button onClick={onDecline} variant="outline" size="sm">
              Decline with Reason
            </Button>
          )}
          {onViewHistory && (
            <Button onClick={onViewHistory} variant="ghost" size="sm" className="ml-auto">
              <History className="w-4 h-4 mr-2" />
              View Stage History
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
