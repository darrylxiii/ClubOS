import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  CheckCircle2,
  Loader2,
  Sparkles,
  Rocket,
  Clock
} from "lucide-react";
import { useNextSteps } from "@/hooks/useNextSteps";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { T } from "@/components/T";
import { useTranslation } from "react-i18next";
import type { JourneyTask } from "@/lib/candidateJourney";

export const NextStepsCard = () => {
  const { tasks, stage, stageInfo, stageCompletion, overallProgress, loading, markTaskComplete } = useNextSteps();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [processingTask, setProcessingTask] = useState<string | null>(null);

  const handleCelebrate = (taskTitle: string, isStageComplete: boolean = false) => {
    if (isStageComplete) {
      // Stage completion celebration - more dramatic
      confetti({
        particleCount: 150,
        spread: 120,
        origin: { y: 0.5 },
        colors: ['#C9A24E', '#F5F4EF', '#FFD700']
      });
      
      toast.success('🎉 Stage Complete!', {
        description: `${taskTitle}. You're making great progress!`,
        duration: 5000,
      });
    } else {
      // Regular task completion
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#C9A24E', '#F5F4EF', '#0E0E10']
      });

      toast.success('Task completed!', {
        description: `${taskTitle} - Great progress!`,
        icon: <CheckCircle2 className="w-4 h-4 text-success" />
      });
    }
  };

  const handleTaskAction = async (task: JourneyTask) => {
    setProcessingTask(task.id);
    navigate(task.actionPath);
    
    setTimeout(() => {
      setProcessingTask(null);
    }, 500);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            <T k="common:dashboard.nextSteps.title" fallback="Next Steps" />
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between mb-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5" />
              <T k="common:dashboard.nextSteps.yourJourney" fallback="Your Journey" />
            </CardTitle>
            <CardDescription>
              {stageInfo.description}
            </CardDescription>
          </div>
          <Badge variant="outline" className={`${stageInfo.color} border-current/20 bg-current/5`}>
            {stageInfo.name}
          </Badge>
        </div>
        
        {/* Stage Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              <T k="common:dashboard.nextSteps.stageProgress" fallback="Stage Progress" />
            </span>
            <span className="font-medium">{stageCompletion}%</span>
          </div>
          <Progress value={stageCompletion} className="h-2" />
        </div>
        
        {/* Overall Progress */}
        <div className="mt-3 pt-3 border-t border-border/20">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              <T k="common:dashboard.nextSteps.overallJourney" fallback="Overall Journey" />
            </span>
            <span className="font-medium">
              {t('common:dashboard.nextSteps.tasksComplete', { 
                completed: overallProgress.completed, 
                total: overallProgress.total,
                defaultValue: `${overallProgress.completed} of ${overallProgress.total} tasks`
              })}
            </span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {tasks.length === 0 ? (
          <div className="text-center py-8">
            <Sparkles className="h-12 w-12 mx-auto mb-3 text-primary" />
            <p className="text-sm font-medium mb-1">
              <T k="common:empty.allCaughtUp" fallback="All caught up!" />
            </p>
            <p className="text-xs text-muted-foreground">
              <T k="common:dashboard.nextSteps.allTasksComplete" fallback="You've completed all tasks for your current stage" />
            </p>
            <Button 
              size="sm" 
              variant="link" 
              className="mt-3"
              onClick={() => navigate('/jobs')}
            >
              <T k="common:dashboard.nextSteps.exploreJobs" fallback="Explore job opportunities" /> →
            </Button>
          </div>
        ) : (
          <>
            {tasks.map((task) => {
              const Icon = task.icon;
              const isProcessing = processingTask === task.id;
              
              return (
                <div
                  key={task.id}
                  className="group relative flex items-start gap-3 p-3 border rounded-lg transition-all duration-200 border-border/20 bg-card/20 backdrop-blur-[var(--blur-glass-subtle)] hover:border-primary/30 hover:shadow-sm"
                >
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-0.5 text-muted-foreground">
                    <Icon className="h-4 w-4" />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="text-sm font-medium">
                          {task.title}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {task.description}
                        </div>
                        
                        {/* Task metadata */}
                        <div className="flex items-center gap-3 mt-2">
                          {task.estimatedTime && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {task.estimatedTime}
                            </div>
                          )}
                          <Badge 
                            variant="outline" 
                            className={`text-[10px] px-1.5 py-0 h-4 ${
                              task.impact === 'high' ? 'border-primary/30 text-primary' :
                              task.impact === 'medium' ? 'border-orange-500/30 text-orange-500' :
                              'border-muted-foreground/30 text-muted-foreground'
                            }`}
                          >
                            {task.impact} impact
                          </Badge>
                        </div>
                      </div>
                      
                      {/* Action button */}
                      <div className="flex-shrink-0">
                        <Button 
                          size="sm" 
                          variant="glass"
                          onClick={() => handleTaskAction(task)}
                          disabled={isProcessing}
                          className="text-xs"
                        >
                          {isProcessing ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <T k="common:actions.start" fallback="Start" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </CardContent>
    </Card>
  );
};
