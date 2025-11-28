import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, Clock, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { candidateProfileTokens } from "@/config/candidate-profile-tokens";
import { getDefaultPipelineStages } from "@/utils/pipelineUtils";

interface Props {
  application?: any;
  onAdvance?: () => void;
  onDecline?: () => void;
}

export const PipelineSidebarCard = ({ application, onAdvance, onDecline }: Props) => {
  if (!application) return null;

  // Get stages from application or job's pipeline_stages or use defaults
  const stages = application.stages?.length > 0 
    ? application.stages 
    : application.job?.pipeline_stages?.length > 0
    ? application.job.pipeline_stages
    : getDefaultPipelineStages();
  
  const currentIndex = application.current_stage_index ?? 0;
  const daysInStage = application.days_in_stage || 0;
  const currentStage = stages[currentIndex];
  
  const getUrgencyColor = (days: number) => {
    if (days < 3) return 'text-green-500';
    if (days < 7) return 'text-yellow-500';
    if (days < 14) return 'text-orange-500';
    return 'text-red-500';
  };

  const getNextStage = () => {
    const nextIndex = currentIndex + 1;
    return nextIndex < stages.length ? stages[nextIndex].name : 'Complete';
  };

  return (
    <Card className={`${candidateProfileTokens.glass.card} sticky top-24`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="w-5 h-5" />
          Pipeline Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Stage Badge */}
        <div className="space-y-2">
          <Badge className={`${candidateProfileTokens.badges.primary} text-lg px-4 py-2 w-full justify-center`}>
            {currentStage?.name?.toUpperCase() || 'IN PROGRESS'}
          </Badge>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Time in stage:</span>
            <span className={`font-semibold flex items-center gap-1 ${getUrgencyColor(daysInStage)}`}>
              <Clock className="w-3 h-3" />
              {daysInStage} days
            </span>
          </div>
        </div>

        {/* Stage Timeline */}
        <div className="space-y-3">
          {stages.map((stage: any, idx: number) => {
            const isCompleted = idx < currentIndex;
            const isCurrent = idx === currentIndex;
            const isFuture = idx > currentIndex;

            return (
              <motion.div
                key={stage.id || idx}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-center gap-3"
              >
                {isCompleted && (
                  <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  </div>
                )}
                {isCurrent && (
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  </div>
                )}
                {isFuture && (
                  <Circle className="w-5 h-5 text-muted-foreground/30" />
                )}
                
                <span className={`text-sm ${
                  isCurrent ? 'font-semibold text-foreground' : 
                  isCompleted ? 'text-muted-foreground' : 
                  'text-muted-foreground/50'
                }`}>
                  {stage.name}
                </span>

                {isCompleted && stage.completed_at && (
                  <span className="text-xs text-muted-foreground ml-auto">
                    {new Date(stage.completed_at).toLocaleDateString()}
                  </span>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="space-y-2 pt-4 border-t">
          {onAdvance && (
            <Button 
              onClick={onAdvance} 
              className="w-full"
              size="sm"
            >
              Advance to {getNextStage()}
            </Button>
          )}
          {onDecline && (
            <Button 
              onClick={onDecline} 
              variant="outline" 
              className="w-full"
              size="sm"
            >
              Decline with Reason
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
