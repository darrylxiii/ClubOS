import { memo, useState, useEffect } from 'react';
import { PressureCookerTask, PressureCookerAction } from '@/types/assessment';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Clock, Mail, CheckCircle, AlertTriangle, FileText, Users, 
  TrendingUp, Paperclip, Eye, EyeOff, ZapIcon
} from 'lucide-react';

interface PressureCookerGameProps {
  session: any;
  elapsedTime: number;
  onComplete: () => void;
}

const TIME_LIMIT = 900;

export const PressureCookerGame = memo(({ session, elapsedTime, onComplete }: PressureCookerGameProps) => {
  const [selectedTask, setSelectedTask] = useState<PressureCookerTask | null>(null);
  const [notes, setNotes] = useState('');
  const [quality, setQuality] = useState([85]);
  const [delegationTarget, setDelegationTarget] = useState<string>('peer');
  const [responseTemplate, setResponseTemplate] = useState<string>('professional');
  const [contextRevealed, setContextRevealed] = useState(false);
  const [interruptTask, setInterruptTask] = useState<PressureCookerTask | null>(null);
  const [focusLevel, setFocusLevel] = useState(100);

  const remainingTime = Math.max(0, TIME_LIMIT - elapsedTime);
  const progress = (elapsedTime / TIME_LIMIT) * 100;

  useEffect(() => {
    const interruptingTask = session.currentTasks.find(
      (t: PressureCookerTask) => t.isInterrupt && !session.completedTaskIds.has(t.id) && t.id !== interruptTask?.id
    );
    if (interruptingTask) {
      setInterruptTask(interruptingTask);
      setSelectedTask(interruptingTask);
    }
  }, [session.currentTasks, session.completedTaskIds, interruptTask]);

  useEffect(() => {
    const interval = setInterval(() => {
      setFocusLevel(prev => Math.max(0, prev - 0.5));
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (remainingTime <= 0) onComplete();
  }, [remainingTime, onComplete]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getUrgencyColor = (urgency: string): string => {
    switch (urgency) {
      case 'critical': return 'bg-destructive text-destructive-foreground';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-muted';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="h-4 w-4" />;
      case 'bug': return <AlertTriangle className="h-4 w-4" />;
      case 'report': return <FileText className="h-4 w-4" />;
      case 'meeting': return <Users className="h-4 w-4" />;
      case 'approval': return <CheckCircle className="h-4 w-4" />;
      case 'escalation': return <TrendingUp className="h-4 w-4" />;
      default: return <Mail className="h-4 w-4" />;
    }
  };

  const handleAction = (actionType: PressureCookerAction['action']) => {
    if (!selectedTask) return;
    
    session.handleTaskAction(
      selectedTask.id,
      actionType,
      actionType === 'complete' ? quality[0] : undefined,
      notes || undefined,
      actionType === 'delegate' ? delegationTarget : undefined,
      actionType === 'complete' ? responseTemplate : undefined
    );

    const focusCost = { complete: 8, delegate: 5, escalate: 6, defer: 2, skip: 1, in_progress: 3 }[actionType] || 5;
    setFocusLevel(prev => Math.max(0, prev - focusCost));

    setNotes('');
    setQuality([85]);
    setDelegationTarget('peer');
    setResponseTemplate('professional');
    setContextRevealed(false);
    setSelectedTask(null);
    if (interruptTask?.id === selectedTask.id) setInterruptTask(null);
  };

  const isTaskBlocked = (task: PressureCookerTask): boolean => {
    if (!task.dependencies) return false;
    return task.dependencies.some((depId: string) => !session.completedTaskIds.has(depId));
  };

  return (
    <div className="h-[100dvh] flex flex-col bg-background overflow-hidden">
      <div className="border-b bg-card p-4">
        <div className="max-w-7xl mx-auto space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <span className={`text-2xl font-bold tabular-nums ${remainingTime < 180 ? 'text-destructive animate-pulse' : ''}`}>
                  {formatTime(remainingTime)}
                </span>
              </div>
              <Separator orientation="vertical" className="h-8" />
              <div className="flex items-center gap-2">
                <ZapIcon className="h-5 w-5 text-primary" />
                <Progress value={focusLevel} className="w-32 h-2" />
                <span className="text-sm text-muted-foreground">{Math.round(focusLevel)}%</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">
                Completed: <span className="font-semibold text-foreground">{session.completedTaskIds.size}</span> / {session.currentTasks.length}
              </div>
              <Button onClick={onComplete} variant="outline" size="sm">Finish Early</Button>
            </div>
          </div>
          <Progress value={progress} className="h-1" />
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="h-full max-w-7xl mx-auto grid grid-cols-2 gap-6 p-6">
          <Card className="flex flex-col">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">Task Inbox</h2>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-2">
                {session.currentTasks.map((task: PressureCookerTask) => {
                  const isCompleted = session.completedTaskIds.has(task.id);
                  const isSelected = selectedTask?.id === task.id;
                  const isBlocked = isTaskBlocked(task);

                  return (
                    <Card
                      key={task.id}
                      className={`p-4 cursor-pointer transition-all hover:border-primary ${
                        isSelected ? 'border-primary bg-accent' : ''
                      } ${isCompleted ? 'opacity-50' : ''} ${isBlocked ? 'border-yellow-500' : ''}`}
                      onClick={() => !isCompleted && setSelectedTask(task)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">{getTypeIcon(task.type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="font-semibold text-sm leading-tight truncate">{task.title}</h3>
                            {isCompleted && <Badge variant="outline" className="shrink-0">✓</Badge>}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={getUrgencyColor(task.urgency)} variant="secondary">{task.urgency}</Badge>
                            <span className="text-xs text-muted-foreground">{task.sender}</span>
                            {isBlocked && <Badge variant="outline" className="text-yellow-600">Blocked</Badge>}
                            {task.attachments && task.attachments.length > 0 && (
                              <Badge variant="outline"><Paperclip className="h-3 w-3 mr-1" />{task.attachments.length}</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          </Card>

          <Card className="flex flex-col">
            {selectedTask ? (
              <>
                <ScrollArea className="flex-1 p-6 space-y-4">
                  <div>
                    <h2 className="text-xl font-bold mb-2">{selectedTask.title}</h2>
                    <p className="text-sm">{selectedTask.description}</p>
                    {selectedTask.hiddenContext && (
                      <Button variant="outline" size="sm" onClick={() => setContextRevealed(!contextRevealed)} className="mt-2">
                        {contextRevealed ? <><EyeOff className="h-4 w-4 mr-2" />Hide</> : <><Eye className="h-4 w-4 mr-2" />Read More</>}
                      </Button>
                    )}
                    {contextRevealed && selectedTask.hiddenContext && (
                      <Card className="mt-2 p-3 bg-accent"><p className="text-sm">{selectedTask.hiddenContext}</p></Card>
                    )}
                  </div>
                  <Separator />
                  <div>
                    <Label>Notes / Response</Label>
                    <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
                  </div>
                  <div>
                    <Label>Quality Level: {quality[0]}%</Label>
                    <Slider value={quality} onValueChange={setQuality} min={50} max={100} step={5} />
                  </div>
                  <div>
                    <Label>Response Tone</Label>
                    <RadioGroup value={responseTemplate} onValueChange={setResponseTemplate}>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="brief" id="brief" />
                          <Label htmlFor="brief">Brief</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="professional" id="professional" />
                          <Label htmlFor="professional">Professional</Label>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>
                </ScrollArea>
                <div className="border-t p-4">
                  <div className="grid grid-cols-3 gap-2">
                    <Button onClick={() => handleAction('complete')} disabled={isTaskBlocked(selectedTask)} className="bg-green-600">Complete</Button>
                    <Button onClick={() => handleAction('delegate')} variant="outline">Delegate</Button>
                    <Button onClick={() => handleAction('defer')} variant="outline">Defer</Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">Select a task</div>
            )}
          </Card>
        </div>
      </div>

      <Dialog open={!!interruptTask} onOpenChange={() => {}}>
        <DialogContent onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />URGENT INTERRUPTION
            </DialogTitle>
          </DialogHeader>
          {interruptTask && (
            <div className="space-y-4">
              <h3 className="font-bold">{interruptTask.title}</h3>
              <p className="text-sm">{interruptTask.description}</p>
              <div className="flex gap-2">
                <Button onClick={() => handleAction('complete')} className="flex-1 bg-green-600">Handle Now</Button>
                <Button onClick={() => handleAction('escalate')} variant="outline" className="flex-1">Escalate</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
});

PressureCookerGame.displayName = 'PressureCookerGame';
