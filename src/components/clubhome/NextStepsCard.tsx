import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  FileText, 
  Calendar, 
  Target, 
  CheckCircle2,
  Loader2,
  Sparkles
} from "lucide-react";
import { useNextSteps } from "@/hooks/useNextSteps";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import confetti from "canvas-confetti";
import { toast } from "sonner";

export const NextStepsCard = () => {
  const { data, loading, markTaskComplete } = useNextSteps();
  const navigate = useNavigate();
  const [processingTask, setProcessingTask] = useState<string | null>(null);

  const handleCelebrate = (taskTitle: string) => {
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
  };

  const handleResumeUpload = () => {
    navigate('/settings?tab=connections&action=upload-resume');
  };

  const handleCalendarConnect = () => {
    navigate('/settings?tab=connections&section=calendar');
  };

  const handleApplyToJobs = () => {
    navigate('/jobs?filter=recommended');
  };

  const tasks = [
    {
      id: 'upload_resume',
      title: 'Upload your resume',
      description: 'Let QUIN analyze your experience',
      icon: FileText,
      completed: data.resumeUploaded,
      action: handleResumeUpload,
      taskKey: 'candidate_add_resume',
    },
    {
      id: 'connect_calendar',
      title: 'Connect calendar',
      description: 'Enable easy interview scheduling',
      icon: Calendar,
      completed: data.calendarConnected,
      action: handleCalendarConnect,
      taskKey: 'candidate_enable_calendar',
    },
    {
      id: 'apply_jobs',
      title: 'Apply to matched jobs',
      description: 'Start your job search journey',
      icon: Target,
      completed: data.hasApplications,
      action: handleApplyToJobs,
      taskKey: 'candidate_apply_job',
    },
  ];

  const completedCount = tasks.filter(t => t.completed).length;
  const totalCount = tasks.length;
  const progressPercent = (completedCount / totalCount) * 100;

  const handleTaskAction = async (task: typeof tasks[0]) => {
    if (task.completed) return;
    
    setProcessingTask(task.id);
    task.action();
    
    // Check if task was completed after a short delay
    setTimeout(async () => {
      setProcessingTask(null);
    }, 500);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Next Steps
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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Next Steps
            </CardTitle>
            <CardDescription>Recommended actions to boost your profile</CardDescription>
          </div>
          {completedCount === totalCount && (
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="h-3 w-3" />
              All done!
            </Badge>
          )}
        </div>
        
        {completedCount < totalCount && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{completedCount} of {totalCount} completed</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-3">
        {tasks.map((task) => {
          const Icon = task.icon;
          const isProcessing = processingTask === task.id;
          
          return (
            <div
              key={task.id}
              className={`
                flex items-center justify-between p-3 border rounded-lg
                transition-all duration-200
                ${task.completed 
                  ? 'border-success/30 bg-success/5 backdrop-blur-[var(--blur-glass-subtle)]' 
                  : 'border-border/20 bg-card/20 backdrop-blur-[var(--blur-glass-subtle)] hover:border-primary/30'
                }
              `}
            >
              <div className="flex items-center gap-3 flex-1">
                {task.completed ? (
                  <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                ) : (
                  <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${task.completed ? 'text-success' : ''}`}>
                    {task.title}
                  </div>
                  {!task.completed && (
                    <div className="text-xs text-muted-foreground">
                      {task.description}
                    </div>
                  )}
                </div>
              </div>
              
              {task.completed ? (
                <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                  Done
                </Badge>
              ) : (
                <Button 
                  size="sm" 
                  variant="glass"
                  onClick={() => handleTaskAction(task)}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    'Start'
                  )}
                </Button>
              )}
            </div>
          );
        })}

        {completedCount === totalCount && (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              Excellent! You've completed all essential next steps.
            </p>
            <Button 
              size="sm" 
              variant="link" 
              className="mt-2"
              onClick={() => navigate('/settings?tab=profile')}
            >
              Continue improving your profile →
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
