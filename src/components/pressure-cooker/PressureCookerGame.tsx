import { memo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Clock, CheckCircle, Forward, Pause, X, TrendingUp } from 'lucide-react';
import { PressureCookerTask } from '@/types/assessment';

interface PressureCookerGameProps {
  session: any;
  elapsedTime: number;
  onComplete: () => void;
}

const TIME_LIMIT = 900; // 15 minutes in seconds

export const PressureCookerGame = memo(({ session, elapsedTime, onComplete }: PressureCookerGameProps) => {
  const [selectedTask, setSelectedTask] = useState<PressureCookerTask | null>(null);
  const [notes, setNotes] = useState('');

  const remainingTime = TIME_LIMIT - elapsedTime;
  const progress = (elapsedTime / TIME_LIMIT) * 100;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      default: return 'bg-blue-500';
    }
  };

  const handleAction = (action: 'complete' | 'delegate' | 'defer' | 'skip' | 'escalate') => {
    if (!selectedTask) return;
    
    const quality = action === 'complete' ? 85 : undefined;
    session.handleTaskAction(selectedTask.id, action, quality, notes);
    setSelectedTask(null);
    setNotes('');
  };

  if (remainingTime <= 0) {
    onComplete();
    return null;
  }

  return (
    <div className="container mx-auto p-4 h-screen flex flex-col gap-4">
      {/* Timer Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              <span className="font-bold text-xl">{formatTime(remainingTime)}</span>
            </div>
            <div className="text-sm text-muted-foreground">
              {session.completedTaskIds.size} / {session.currentTasks.length} completed
            </div>
          </div>
          <Progress value={progress} className="h-2" />
        </CardContent>
      </Card>

      <div className="flex-1 grid grid-cols-3 gap-4 overflow-hidden">
        {/* Task Inbox */}
        <Card className="overflow-hidden flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Task Inbox</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-2">
            {session.currentTasks.map((task: PressureCookerTask) => (
              <button
                key={task.id}
                onClick={() => setSelectedTask(task)}
                disabled={session.completedTaskIds.has(task.id)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedTask?.id === task.id 
                    ? 'border-primary bg-primary/10' 
                    : session.completedTaskIds.has(task.id)
                    ? 'border-muted bg-muted opacity-50'
                    : 'border-border hover:border-primary'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="font-medium text-sm line-clamp-1">{task.title}</span>
                  {session.completedTaskIds.has(task.id) && (
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Badge variant="outline" className={`${getUrgencyColor(task.urgency)} text-white border-0`}>
                    {task.urgency}
                  </Badge>
                  <span className="text-muted-foreground">{task.estimatedTime}min</span>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Task Detail */}
        <Card className="col-span-2 overflow-hidden flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg">Task Details</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto">
            {selectedTask ? (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg mb-2">{selectedTask.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{selectedTask.description}</p>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge variant="outline">From: {selectedTask.sender}</Badge>
                    <Badge variant="outline" className={getUrgencyColor(selectedTask.urgency)}>
                      {selectedTask.urgency}
                    </Badge>
                    <Badge variant="outline">Impact: {selectedTask.impact}</Badge>
                    <Badge variant="outline">~{selectedTask.estimatedTime}min</Badge>
                    {selectedTask.dueIn && (
                      <Badge variant="outline" className="bg-red-500/10">
                        Due in {selectedTask.dueIn}min
                      </Badge>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Notes (optional)</label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add notes about this task..."
                    className="min-h-[80px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={() => handleAction('complete')} className="gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Complete
                  </Button>
                  <Button onClick={() => handleAction('delegate')} variant="outline" className="gap-2">
                    <Forward className="h-4 w-4" />
                    Delegate
                  </Button>
                  <Button onClick={() => handleAction('defer')} variant="outline" className="gap-2">
                    <Pause className="h-4 w-4" />
                    Defer
                  </Button>
                  <Button onClick={() => handleAction('skip')} variant="outline" className="gap-2">
                    <X className="h-4 w-4" />
                    Skip
                  </Button>
                  <Button onClick={() => handleAction('escalate')} variant="outline" className="col-span-2 gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Escalate
                  </Button>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                Select a task from the inbox to get started
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <Button onClick={onComplete} variant="outline" className="w-full">
            Finish Early & Submit
          </Button>
        </CardContent>
      </Card>
    </div>
  );
});

PressureCookerGame.displayName = 'PressureCookerGame';
