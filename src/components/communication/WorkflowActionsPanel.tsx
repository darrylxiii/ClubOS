import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  ListTodo, 
  Bell, 
  Calendar,
  UserPlus,
  ChevronRight,
  Loader2,
  CheckCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/lib/notify';
import { motion } from '@/lib/motion';
import { useTranslation } from 'react-i18next';

interface WorkflowActionsPanelProps {
  entityType: string;
  entityId: string;
  patternType?: string;
}

export function WorkflowActionsPanel({ entityType, entityId, patternType }: WorkflowActionsPanelProps) {
  const { t } = useTranslation('common');
  const [executing, setExecuting] = useState<string | null>(null);
  const [executed, setExecuted] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const workflowActions = [
    {
      id: 'create_task',
      label: t('communication.workflow.createTask', 'Create Follow-up Task'),
      description: t('communication.workflow.createTaskDesc', 'Add a task to Club Pilot for this relationship'),
      icon: ListTodo,
      color: 'text-blue-500'
    },
    {
      id: 'send_notification',
      label: t('communication.workflow.sendAlert', 'Send Alert'),
      description: t('communication.workflow.sendAlertDesc', 'Notify assigned strategist about this pattern'),
      icon: Bell,
      color: 'text-yellow-500'
    },
    {
      id: 'schedule_followup',
      label: t('communication.workflow.scheduleFollowup', 'Schedule Follow-up'),
      description: t('communication.workflow.scheduleFollowupDesc', 'Set a reminder for future outreach'),
      icon: Calendar,
      color: 'text-green-500'
    },
    {
      id: 'assign_strategist',
      label: t('communication.workflow.escalate', 'Escalate to Strategist'),
      description: t('communication.workflow.escalateDesc', 'Assign a senior strategist to this case'),
      icon: UserPlus,
      color: 'text-purple-500'
    }
  ];

  const executeAction = async (actionType: string) => {
    setExecuting(actionType);
    try {
      const { data, error } = await supabase.functions.invoke('execute-communication-workflow', {
        body: {
          trigger: {
            type: patternType ? 'pattern_detected' : 'manual',
            pattern_type: patternType,
            entity_type: entityType,
            entity_id: entityId
          },
          actions: [{
            action_type: actionType,
            parameters: getDefaultParameters(actionType)
          }]
        }
      });

      if (error) throw error;

      setExecuted(prev => new Set([...prev, actionType]));
      toast({
        title: t('communication.workflow.actionExecuted', 'Action executed'),
        description: t('communication.workflow.actionExecutedDesc', 'Successfully executed {{action}}', { action: actionType.replace(/_/g, ' ') })
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('communication.workflow.actionFailedDesc', 'Failed to execute action');
      toast({
        title: t('communication.workflow.actionFailed', 'Action failed'),
        description: message,
        variant: 'destructive'
      });
    } finally {
      setExecuting(null);
    }
  };

  const executeAllRecommended = async () => {
    setExecuting('all');
    try {
      const { data, error } = await supabase.functions.invoke('execute-communication-workflow', {
        body: {
          trigger: {
            type: patternType ? 'pattern_detected' : 'manual',
            pattern_type: patternType,
            entity_type: entityType,
            entity_id: entityId
          }
          // No actions means use defaults based on pattern
        }
      });

      if (error) throw error;

      toast({
        title: t('communication.workflow.workflowExecuted', 'Workflow executed'),
        description: t('communication.workflow.workflowExecutedDesc', 'Executed {{count}} recommended actions', { count: data?.actions_executed || 0 })
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('communication.workflow.workflowFailedDesc', 'Failed to execute workflow');
      toast({
        title: t('communication.workflow.workflowFailed', 'Workflow failed'),
        description: message,
        variant: 'destructive'
      });
    } finally {
      setExecuting(null);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            {t('communication.workflow.quickActions', 'Quick Actions')}
          </CardTitle>
          {patternType && (
            <Badge variant="secondary" className="capitalize">
              {patternType.replace(/_/g, ' ')}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {patternType && (
          <Button
            className="w-full mb-4"
            onClick={executeAllRecommended}
            disabled={executing === 'all'}
          >
            {executing === 'all' ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Zap className="h-4 w-4 mr-2" />
            )}
            {t('communication.workflow.executeRecommended', 'Execute Recommended Actions')}
          </Button>
        )}

        <div className="space-y-2">
          {workflowActions.map((action, index) => {
            const Icon = action.icon;
            const isExecuting = executing === action.id;
            const isExecuted = executed.has(action.id);

            return (
              <motion.div
                key={action.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Button
                  variant="outline"
                  className="w-full justify-start h-auto py-3"
                  onClick={() => executeAction(action.id)}
                  disabled={isExecuting || isExecuted}
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className={`p-2 rounded-lg bg-muted ${action.color}`}>
                      {isExecuted ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : isExecuting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-sm">{action.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {action.description}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Button>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function getDefaultParameters(actionType: string): Record<string, unknown> {
  switch (actionType) {
    case 'create_task':
      return {
        title: 'Follow up on relationship',
        description: 'Manual follow-up task created',
        priority: 'medium',
        due_days: 3
      };
    case 'send_notification':
      return {
        title: 'Relationship Update',
        message: 'A relationship needs your attention',
        type: 'info'
      };
    case 'schedule_followup':
      return {
        days_from_now: 7,
        followup_type: 'check_in',
        notes: 'Scheduled follow-up'
      };
    case 'assign_strategist':
      return {
        reason: 'Manual escalation request',
        escalation_level: 'standard'
      };
    default:
      return {};
  }
}
