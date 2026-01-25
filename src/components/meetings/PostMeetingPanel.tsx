/**
 * Post-Meeting Panel Component
 * 
 * Displays auto-generated follow-ups, action items, and ROI metrics
 */

import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Mail, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  TrendingUp,
  AlertCircle,
  Send,
  RefreshCw
} from 'lucide-react';
import { usePostMeetingAutomation } from '@/hooks/usePostMeetingAutomation';
import { cn } from '@/lib/utils';

interface PostMeetingPanelProps {
  meetingId: string;
  className?: string;
}

export function PostMeetingPanel({ meetingId, className }: PostMeetingPanelProps) {
  const {
    followUp,
    actionItems,
    roiMetrics,
    isLoading,
    isGenerating,
    fetchFollowUp,
    generateFollowUp,
    updateActionItemStatus,
    sendFollowUpEmail,
  } = usePostMeetingAutomation(meetingId);

  useEffect(() => {
    fetchFollowUp();
  }, [fetchFollowUp]);

  const completedItems = actionItems.filter(item => item.status === 'completed').length;
  const progressPercent = actionItems.length > 0 
    ? Math.round((completedItems / actionItems.length) * 100) 
    : 0;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-destructive text-destructive-foreground';
      case 'high': return 'bg-orange-500/20 text-orange-600';
      case 'medium': return 'bg-primary/20 text-primary';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getEfficiencyLabel = (score: number | null) => {
    if (!score) return { label: 'Not calculated', color: 'text-muted-foreground' };
    if (score >= 80) return { label: 'Excellent', color: 'text-green-500' };
    if (score >= 60) return { label: 'Good', color: 'text-primary' };
    if (score >= 40) return { label: 'Average', color: 'text-yellow-500' };
    return { label: 'Needs improvement', color: 'text-orange-500' };
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with Generate Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Post-Meeting Summary</h2>
          <p className="text-sm text-muted-foreground">
            AI-generated follow-ups and action items
          </p>
        </div>
        {!followUp ? (
          <Button 
            onClick={() => generateFollowUp()} 
            disabled={isGenerating}
            className="gap-2"
          >
            {isGenerating ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Generate Follow-up
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={() => generateFollowUp()}
            disabled={isGenerating}
            size="sm"
            className="gap-2"
          >
            <RefreshCw className={cn('h-4 w-4', isGenerating && 'animate-spin')} />
            Regenerate
          </Button>
        )}
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Loading post-meeting data...
          </CardContent>
        </Card>
      ) : !followUp ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Sparkles className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              No follow-up generated yet. Click the button above to create one.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ROI Metrics Card */}
          {roiMetrics && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Meeting Efficiency
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-2xl font-bold">
                      {roiMetrics.efficiency_score ?? '-'}%
                    </p>
                    <p className={cn(
                      'text-sm',
                      getEfficiencyLabel(roiMetrics.efficiency_score).color
                    )}>
                      {getEfficiencyLabel(roiMetrics.efficiency_score).label}
                    </p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{roiMetrics.duration_minutes ?? '-'}</p>
                    <p className="text-sm text-muted-foreground">Minutes</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{roiMetrics.decisions_made}</p>
                    <p className="text-sm text-muted-foreground">Decisions</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{roiMetrics.action_items_count}</p>
                    <p className="text-sm text-muted-foreground">Action Items</p>
                  </div>
                </div>
                {roiMetrics.could_have_been_email && (
                  <div className="mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <p className="text-sm text-yellow-600 dark:text-yellow-400 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      This meeting could have been an email
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Follow-up Email Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Thank You Email
                </CardTitle>
                <Badge variant={followUp.status === 'sent' ? 'default' : 'secondary'}>
                  {followUp.status}
                </Badge>
              </div>
              {followUp.email_subject && (
                <CardDescription className="font-medium text-foreground">
                  Subject: {followUp.email_subject}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {followUp.email_body ? (
                <>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                      {followUp.email_body}
                    </p>
                  </div>
                  {followUp.status !== 'sent' && (
                    <Button 
                      onClick={sendFollowUpEmail}
                      className="mt-4 gap-2"
                      size="sm"
                    >
                      <Send className="h-4 w-4" />
                      Send Email
                    </Button>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No email content generated.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Action Items Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Action Items
                </CardTitle>
                <span className="text-sm text-muted-foreground">
                  {completedItems}/{actionItems.length} completed
                </span>
              </div>
              {actionItems.length > 0 && (
                <Progress value={progressPercent} className="h-2" />
              )}
            </CardHeader>
            <CardContent>
              {actionItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No action items generated.
                </p>
              ) : (
                <div className="space-y-3">
                  {actionItems.map((item) => (
                    <div 
                      key={item.id}
                      className={cn(
                        'flex items-start gap-3 p-3 rounded-lg border',
                        item.status === 'completed' && 'opacity-60'
                      )}
                    >
                      <Checkbox
                        checked={item.status === 'completed'}
                        onCheckedChange={(checked) => {
                          updateActionItemStatus(
                            item.id, 
                            checked ? 'completed' : 'pending'
                          );
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'font-medium text-sm',
                          item.status === 'completed' && 'line-through'
                        )}>
                          {item.title}
                        </p>
                        {item.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {item.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <Badge 
                            variant="outline" 
                            className={cn('text-xs', getPriorityColor(item.priority))}
                          >
                            {item.priority}
                          </Badge>
                          {item.due_date && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Due: {new Date(item.due_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Meeting Summary Card */}
          {followUp.generated_content?.summary && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Meeting Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {followUp.generated_content.summary.key_points?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Key Points</h4>
                    <ul className="space-y-1">
                      {followUp.generated_content.summary.key_points.map((point, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-primary">•</span>
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {followUp.generated_content.summary.decisions?.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-medium mb-2">Decisions Made</h4>
                      <ul className="space-y-1">
                        {followUp.generated_content.summary.decisions.map((decision, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                            {decision}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}

                {followUp.generated_content.summary.next_steps?.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-medium mb-2">Next Steps</h4>
                      <ul className="space-y-1">
                        {followUp.generated_content.summary.next_steps.map((step, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-primary font-medium">{i + 1}.</span>
                            {step}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
