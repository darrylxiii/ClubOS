import React, { useState } from 'react';
import { useWorkspaceAutomations, TriggerType, ActionType } from '@/hooks/useWorkspaceAutomations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Zap, 
  Trash2, 
  Play,
  Bell,
  Edit3,
  FileText,
  Webhook,
  Mail,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface AutomationBuilderProps {
  workspaceId: string;
  databases?: Array<{ id: string; name: string }>;
}

const TRIGGER_OPTIONS: { value: TriggerType; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'row_created', label: 'Row Created', icon: <Plus className="h-4 w-4" />, description: 'When a new row is added' },
  { value: 'row_updated', label: 'Row Updated', icon: <Edit3 className="h-4 w-4" />, description: 'When any row is modified' },
  { value: 'row_deleted', label: 'Row Deleted', icon: <Trash2 className="h-4 w-4" />, description: 'When a row is removed' },
  { value: 'field_changed', label: 'Field Changed', icon: <Edit3 className="h-4 w-4" />, description: 'When a specific field changes' },
  { value: 'scheduled', label: 'Scheduled', icon: <Clock className="h-4 w-4" />, description: 'Run at specific times' },
];

const ACTION_OPTIONS: { value: ActionType; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'send_notification', label: 'Send Notification', icon: <Bell className="h-4 w-4" />, description: 'Show in-app notification' },
  { value: 'update_field', label: 'Update Field', icon: <Edit3 className="h-4 w-4" />, description: 'Modify a field value' },
  { value: 'create_page', label: 'Create Page', icon: <FileText className="h-4 w-4" />, description: 'Create a new page' },
  { value: 'call_webhook', label: 'Call Webhook', icon: <Webhook className="h-4 w-4" />, description: 'Send HTTP request' },
  { value: 'send_email', label: 'Send Email', icon: <Mail className="h-4 w-4" />, description: 'Send an email' },
];

export function AutomationBuilder({ workspaceId, databases = [] }: AutomationBuilderProps) {
  const { automations, isLoading, createAutomation, deleteAutomation, toggleAutomation } = useWorkspaceAutomations(workspaceId);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    database_id: '',
    trigger_type: 'row_created' as TriggerType,
    trigger_config: {} as Record<string, unknown>,
    action_type: 'send_notification' as ActionType,
    action_config: {} as Record<string, unknown>,
  });

  const handleCreate = () => {
    createAutomation.mutate({
      workspace_id: workspaceId,
      database_id: formData.database_id || null,
      name: formData.name,
      description: formData.description || null,
      is_active: true,
      trigger_type: formData.trigger_type,
      trigger_config: formData.trigger_config as Record<string, string | number | boolean | null>,
      action_type: formData.action_type,
      action_config: formData.action_config as Record<string, string | number | boolean | null>,
    }, {
      onSuccess: () => {
        setIsDialogOpen(false);
        setFormData({
          name: '',
          description: '',
          database_id: '',
          trigger_type: 'row_created',
          trigger_config: {},
          action_type: 'send_notification',
          action_config: {},
        });
      }
    });
  };

  const selectedTrigger = TRIGGER_OPTIONS.find(t => t.value === formData.trigger_type);
  const selectedAction = ACTION_OPTIONS.find(a => a.value === formData.action_type);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Automations</h2>
          <p className="text-sm text-muted-foreground">
            Automate repetitive tasks when events occur
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Automation
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Automation</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {/* Name & Description */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="My Automation"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description (optional)</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="What does this automation do?"
                    rows={2}
                  />
                </div>
              </div>

              {/* Database Selection */}
              {databases.length > 0 && (
                <div className="space-y-2">
                  <Label>Database (optional)</Label>
                  <Select
                    value={formData.database_id}
                    onValueChange={(value) => setFormData({ ...formData, database_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a database..." />
                    </SelectTrigger>
                    <SelectContent>
                      {databases.map((db) => (
                        <SelectItem key={db.id} value={db.id}>
                          {db.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Trigger Selection */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-accent" />
                  When this happens...
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {TRIGGER_OPTIONS.map((trigger) => (
                    <button
                      key={trigger.value}
                      onClick={() => setFormData({ ...formData, trigger_type: trigger.value })}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg border text-left transition-colors",
                        formData.trigger_type === trigger.value
                          ? "border-accent bg-accent/10"
                          : "border-border hover:border-accent/50"
                      )}
                    >
                      <div className="text-accent mt-0.5">{trigger.icon}</div>
                      <div>
                        <p className="font-medium text-sm">{trigger.label}</p>
                        <p className="text-xs text-muted-foreground">{trigger.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Visual Connector */}
              <div className="flex items-center justify-center py-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="h-8 w-px bg-border" />
                  <ArrowRight className="h-4 w-4" />
                  <div className="h-8 w-px bg-border" />
                </div>
              </div>

              {/* Action Selection */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Play className="h-4 w-4 text-primary" />
                  Do this...
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {ACTION_OPTIONS.map((action) => (
                    <button
                      key={action.value}
                      onClick={() => setFormData({ ...formData, action_type: action.value })}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg border text-left transition-colors",
                        formData.action_type === action.value
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className="text-primary mt-0.5">{action.icon}</div>
                      <div>
                        <p className="font-medium text-sm">{action.label}</p>
                        <p className="text-xs text-muted-foreground">{action.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Config based on type */}
              {formData.action_type === 'send_notification' && (
                <div className="space-y-2 p-4 rounded-lg bg-muted/30">
                  <Label>Notification Message</Label>
                  <Input
                    value={(formData.action_config.message as string) || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      action_config: { ...formData.action_config, message: e.target.value }
                    })}
                    placeholder="A new item was created"
                  />
                </div>
              )}

              {formData.action_type === 'call_webhook' && (
                <div className="space-y-3 p-4 rounded-lg bg-muted/30">
                  <div className="space-y-2">
                    <Label>Webhook URL</Label>
                    <Input
                      value={(formData.action_config.url as string) || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        action_config: { ...formData.action_config, url: e.target.value }
                      })}
                      placeholder="https://api.example.com/webhook"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Method</Label>
                    <Select
                      value={(formData.action_config.method as string) || 'POST'}
                      onValueChange={(value) => setFormData({
                        ...formData,
                        action_config: { ...formData.action_config, method: value }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="POST">POST</SelectItem>
                        <SelectItem value="GET">GET</SelectItem>
                        <SelectItem value="PUT">PUT</SelectItem>
                        <SelectItem value="PATCH">PATCH</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {formData.action_type === 'send_email' && (
                <div className="space-y-3 p-4 rounded-lg bg-muted/30">
                  <div className="space-y-2">
                    <Label>To Email</Label>
                    <Input
                      value={(formData.action_config.to as string) || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        action_config: { ...formData.action_config, to: e.target.value }
                      })}
                      placeholder="recipient@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Subject</Label>
                    <Input
                      value={(formData.action_config.subject as string) || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        action_config: { ...formData.action_config, subject: e.target.value }
                      })}
                      placeholder="New item created"
                    />
                  </div>
                </div>
              )}

              {/* Create Button */}
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreate}
                  disabled={!formData.name || createAutomation.isPending}
                >
                  {createAutomation.isPending ? 'Creating...' : 'Create Automation'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Automations List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : automations.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Zap className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No automations yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first automation to streamline your workflow
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Automation
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {automations.map((automation) => {
            const trigger = TRIGGER_OPTIONS.find(t => t.value === automation.trigger_type);
            const action = ACTION_OPTIONS.find(a => a.value === automation.action_type);
            
            return (
              <Card key={automation.id} className={cn(!automation.is_active && "opacity-60")}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-base flex items-center gap-2">
                        {automation.name}
                        <Badge variant={automation.is_active ? "default" : "secondary"} className="text-xs">
                          {automation.is_active ? 'Active' : 'Paused'}
                        </Badge>
                      </CardTitle>
                      {automation.description && (
                        <CardDescription>{automation.description}</CardDescription>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={automation.is_active}
                        onCheckedChange={(checked) => toggleAutomation.mutate({ id: automation.id, is_active: checked })}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteAutomation.mutate(automation.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-accent/10 text-accent">
                      {trigger?.icon}
                      <span>{trigger?.label}</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary/10 text-primary">
                      {action?.icon}
                      <span>{action?.label}</span>
                    </div>
                    {automation.trigger_count > 0 && (
                      <span className="text-xs text-muted-foreground ml-auto">
                        Triggered {automation.trigger_count} times
                        {automation.last_triggered_at && (
                          <> · Last: {format(new Date(automation.last_triggered_at), 'MMM d, HH:mm')}</>
                        )}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
