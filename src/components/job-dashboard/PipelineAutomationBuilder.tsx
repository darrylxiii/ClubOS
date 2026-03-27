import { memo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  ArrowRight,
  Zap,
  Mail,
  Bell,
  ListTodo,
  FastForward,
  MoveRight,
  RefreshCw,
  Clock,
  Calendar,
  MessageSquare,
  FileCheck,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  usePipelineAutomations,
  type PipelineTriggerType,
  type PipelineActionType,
  type PipelineAutomation,
} from "@/hooks/usePipelineAutomations";
import { useConfirmDialog } from "@/components/ui/ConfirmActionDialog";

interface PipelineStage {
  order: number;
  name: string;
  [key: string]: unknown;
}

interface PipelineAutomationBuilderProps {
  jobId: string;
  stages: PipelineStage[];
}

const TRIGGER_OPTIONS: { value: PipelineTriggerType; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'stage_change', label: 'Stage Change', icon: <MoveRight className="h-4 w-4" />, description: 'When a candidate moves between stages' },
  { value: 'status_change', label: 'Status Change', icon: <RefreshCw className="h-4 w-4" />, description: 'When application status changes (e.g., rejected, hired)' },
  { value: 'days_in_stage_exceeded', label: 'Days in Stage', icon: <Clock className="h-4 w-4" />, description: 'When a candidate has been in a stage too long' },
  { value: 'interview_scheduled', label: 'Interview Scheduled', icon: <Calendar className="h-4 w-4" />, description: 'When an interview is booked' },
  { value: 'feedback_added', label: 'Feedback Added', icon: <FileCheck className="h-4 w-4" />, description: 'When a scorecard or feedback is submitted' },
  { value: 'message_sent', label: 'Message Sent', icon: <MessageSquare className="h-4 w-4" />, description: 'When a message is sent to a candidate' },
];

const ACTION_OPTIONS: { value: PipelineActionType; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'send_email', label: 'Send Email', icon: <Mail className="h-4 w-4" />, description: 'Send an email notification' },
  { value: 'send_notification', label: 'Notify Team', icon: <Bell className="h-4 w-4" />, description: 'Send in-app notification' },
  { value: 'create_task', label: 'Create Task', icon: <ListTodo className="h-4 w-4" />, description: 'Create a follow-up task' },
  { value: 'auto_advance', label: 'Auto-Advance', icon: <FastForward className="h-4 w-4" />, description: 'Automatically move to next stage' },
];

export const PipelineAutomationBuilder = memo(({ jobId, stages }: PipelineAutomationBuilderProps) => {
  const { t } = useTranslation('jobDashboard');
  const { automations, isLoading, createAutomation, deleteAutomation, toggleAutomation } = usePipelineAutomations(jobId);
  const { confirm, Dialog: ConfirmDialog } = useConfirmDialog();
  const [showCreate, setShowCreate] = useState(false);

  // Create form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggerType, setTriggerType] = useState<PipelineTriggerType | ''>('');
  const [actionType, setActionType] = useState<PipelineActionType | ''>('');
  const [triggerConfig, setTriggerConfig] = useState<Record<string, unknown>>({});
  const [actionConfig, setActionConfig] = useState<Record<string, unknown>>({});

  const resetForm = () => {
    setName('');
    setDescription('');
    setTriggerType('');
    setActionType('');
    setTriggerConfig({});
    setActionConfig({});
  };

  const handleCreate = async () => {
    if (!name || !triggerType || !actionType) return;
    await createAutomation.mutateAsync({
      name,
      description: description || undefined,
      trigger_type: triggerType,
      trigger_config: triggerConfig,
      action_type: actionType,
      action_config: actionConfig,
    });
    resetForm();
    setShowCreate(false);
  };

  const handleDelete = (automation: PipelineAutomation) => {
    confirm(
      {
        type: 'destructive',
        title: t('automations.deleteTitle', 'Delete Automation'),
        description: t('automations.deleteDesc', 'Are you sure you want to delete "{{name}}"?', { name: automation.name }),
        confirmText: t('actions.delete', 'Delete'),
      },
      async () => {
        await deleteAutomation.mutateAsync(automation.id);
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">
            {t('automations.title', 'Pipeline Automations')}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('automations.subtitle', 'Automate actions when pipeline events occur')}
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setShowCreate(true)}>
          <Plus className="w-3.5 h-3.5" />
          {t('automations.create', 'New Rule')}
        </Button>
      </div>

      {/* Automation list */}
      {automations.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <Zap className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {t('automations.empty', 'No automations yet. Create one to get started.')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {automations.map((auto) => {
            const trigger = TRIGGER_OPTIONS.find((o) => o.value === auto.trigger_type);
            const action = ACTION_OPTIONS.find((o) => o.value === auto.action_type);
            return (
              <Card key={auto.id} className={cn("transition-opacity", !auto.is_active && "opacity-50")}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={auto.is_active}
                      onCheckedChange={(checked) => toggleAutomation.mutate({ id: auto.id, is_active: checked })}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium truncate">{auto.name}</span>
                        {auto.trigger_count > 0 && (
                          <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                            {auto.trigger_count}x
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          {trigger?.icon}
                          {trigger?.label}
                        </span>
                        <ArrowRight className="w-3 h-3" />
                        <span className="flex items-center gap-1">
                          {action?.icon}
                          {action?.label}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => handleDelete(auto)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={(open) => { if (!open) resetForm(); setShowCreate(open); }}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{t('automations.createTitle', 'New Automation Rule')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t('automations.name', 'Rule Name')}</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('automations.namePlaceholder', 'e.g., Email candidate on stage change')}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('automations.description', 'Description (optional)')}</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('automations.descriptionPlaceholder', 'What does this rule do?')}
                rows={2}
              />
            </div>

            {/* Trigger */}
            <div className="space-y-2">
              <Label>{t('automations.when', 'When (Trigger)')}</Label>
              <Select value={triggerType} onValueChange={(v) => { setTriggerType(v as PipelineTriggerType); setTriggerConfig({}); }}>
                <SelectTrigger>
                  <SelectValue placeholder={t('automations.selectTrigger', 'Select trigger...')} />
                </SelectTrigger>
                <SelectContent>
                  {TRIGGER_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className="flex items-center gap-2">
                        {opt.icon} {opt.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Trigger-specific config */}
              {triggerType === 'stage_change' && (
                <div className="grid grid-cols-2 gap-2 pl-4 border-l-2 border-border/40">
                  <div className="space-y-1">
                    <Label className="text-xs">{t('automations.fromStage', 'From Stage (any)')}</Label>
                    <Select
                      value={triggerConfig.from_stage as string || 'any'}
                      onValueChange={(v) => setTriggerConfig({ ...triggerConfig, from_stage: v === 'any' ? undefined : Number(v) })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">{t("any_stage", "Any stage")}</SelectItem>
                        {stages.map((s) => (
                          <SelectItem key={s.order} value={String(s.order)}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t('automations.toStage', 'To Stage (any)')}</Label>
                    <Select
                      value={triggerConfig.to_stage as string || 'any'}
                      onValueChange={(v) => setTriggerConfig({ ...triggerConfig, to_stage: v === 'any' ? undefined : Number(v) })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">{t("any_stage", "Any stage")}</SelectItem>
                        {stages.map((s) => (
                          <SelectItem key={s.order} value={String(s.order)}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {triggerType === 'days_in_stage_exceeded' && (
                <div className="pl-4 border-l-2 border-border/40">
                  <Label className="text-xs">{t('automations.threshold', 'Threshold (days)')}</Label>
                  <Input
                    type="number"
                    className="h-8 text-xs w-24 mt-1"
                    value={(triggerConfig.threshold_days as number) || 7}
                    onChange={(e) => setTriggerConfig({ ...triggerConfig, threshold_days: Number(e.target.value) })}
                    min={1}
                    max={90}
                  />
                </div>
              )}
            </div>

            {/* Action */}
            <div className="space-y-2">
              <Label>{t('automations.then', 'Then (Action)')}</Label>
              <Select value={actionType} onValueChange={(v) => { setActionType(v as PipelineActionType); setActionConfig({}); }}>
                <SelectTrigger>
                  <SelectValue placeholder={t('automations.selectAction', 'Select action...')} />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className="flex items-center gap-2">
                        {opt.icon} {opt.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Action-specific config */}
              {actionType === 'send_email' && (
                <div className="pl-4 border-l-2 border-border/40 space-y-2">
                  <div className="space-y-1">
                    <Label className="text-xs">{t('automations.emailSubject', 'Email Subject')}</Label>
                    <Input
                      className="h-8 text-xs"
                      value={(actionConfig.subject as string) || ''}
                      onChange={(e) => setActionConfig({ ...actionConfig, subject: e.target.value })}
                      placeholder="Update on your application for {{job_title}}"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t('automations.emailBody', 'Email Body')}</Label>
                    <Textarea
                      className="text-xs"
                      rows={3}
                      value={(actionConfig.body as string) || ''}
                      onChange={(e) => setActionConfig({ ...actionConfig, body: e.target.value })}
                      placeholder="Hi {{candidate_name}}, ..."
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {t('automations.variables', 'Variables: {{candidate_name}}, {{job_title}}, {{company_name}}, {{stage_name}}')}
                  </p>
                </div>
              )}

              {actionType === 'create_task' && (
                <div className="pl-4 border-l-2 border-border/40 space-y-2">
                  <div className="space-y-1">
                    <Label className="text-xs">{t('automations.taskTitle', 'Task Title')}</Label>
                    <Input
                      className="h-8 text-xs"
                      value={(actionConfig.task_title as string) || ''}
                      onChange={(e) => setActionConfig({ ...actionConfig, task_title: e.target.value })}
                      placeholder="Follow up with {{candidate_name}}"
                    />
                  </div>
                </div>
              )}

              {actionType === 'send_notification' && (
                <div className="pl-4 border-l-2 border-border/40 space-y-2">
                  <div className="space-y-1">
                    <Label className="text-xs">{t('automations.notificationMessage', 'Notification Message')}</Label>
                    <Input
                      className="h-8 text-xs"
                      value={(actionConfig.message as string) || ''}
                      onChange={(e) => setActionConfig({ ...actionConfig, message: e.target.value })}
                      placeholder="{{candidate_name}} has been moved to {{stage_name}}"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setShowCreate(false); }}>
              {t('actions.cancel', 'Cancel')}
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!name || !triggerType || !actionType || createAutomation.isPending}
            >
              {createAutomation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Zap className="w-4 h-4 mr-2" />
              )}
              {t('automations.createRule', 'Create Rule')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog />
    </div>
  );
});

PipelineAutomationBuilder.displayName = 'PipelineAutomationBuilder';
