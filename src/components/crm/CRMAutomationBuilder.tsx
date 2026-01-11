import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Plus, Trash2, Zap, ArrowDown,
  Mail, Bell, UserPlus, Tag, Clock, MessageSquare, Loader2, BrainCircuit
} from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// DB Schema Types
interface AutomationAction {
  type: string;
  config: Record<string, any>;
}

interface CRMAutomation {
  id: string;
  name: string;
  trigger_type: string;
  trigger_config: Record<string, any>;
  actions: AutomationAction[];
  is_active: boolean;
  run_count: number;
}

const TRIGGER_OPTIONS = [
  { value: 'stage_change', label: 'Stage Changed', icon: Tag },
  // Future: { value: 'reply_received', label: 'Reply Received', icon: MessageSquare },
  // Future: { value: 'no_activity', label: 'No Activity For X Days', icon: Clock },
  // Future: { value: 'score_threshold', label: 'Score Reaches Threshold', icon: Zap },
];

const ACTION_OPTIONS = [
  { value: 'create_task', label: 'Create Task', icon: Plus },
  { value: 'notify_user', label: 'Notify User', icon: Bell },
  { value: 'ai_decision', label: 'AI Decision', icon: BrainCircuit },
  // Future: { value: 'send_email', label: 'Send Email', icon: Mail },
  // Future: { value: 'update_field', label: 'Update Field', icon: Tag },
];

export function CRMAutomationBuilder() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);

  // Fetch Automations
  const { data: automations = [], isLoading } = useQuery({
    queryKey: ['crm-automations'],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('crm_automations' as any)
        .select('*')
        .order('created_at', { ascending: false }) as any);
      if (error) throw error;
      return (data || []) as CRMAutomation[];
    }
  });

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const newAutomation = {
        name: 'New Automation',
        trigger_type: 'stage_change',
        trigger_config: { from: '*', to: 'qualified' },
        actions: [{ type: 'create_task', config: { subject: 'Follow up', priority: 'high' } }],
        is_active: false
      };
      const { data, error } = await (supabase.from('crm_automations' as any).insert(newAutomation).select().single() as any);
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['crm-automations'] });
      setEditingId(data.id);
      toast.success('Automation created');
    }
  });

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: async (vars: { id: string, updates: Partial<CRMAutomation> }) => {
      const { error } = await (supabase.from('crm_automations' as any).update(vars.updates).eq('id', vars.id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-automations'] });
    }
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('crm_automations' as any).delete().eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-automations'] });
      toast.success('Automation deleted');
    }
  });

  const handleUpdateTrigger = (id: string, type: string) => {
    updateMutation.mutate({ id, updates: { trigger_type: type } });
  };

  const handleUpdateAction = (id: string, index: number, type: string) => {
    const automation = automations.find(a => a.id === id);
    if (!automation) return;

    const newActions = [...automation.actions];
    newActions[index] = { ...newActions[index], type, config: {} };
    updateMutation.mutate({ id, updates: { actions: newActions } });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            Automation Workflows
          </h2>
          <p className="text-muted-foreground">Automate repetitive CRM tasks</p>
        </div>
        <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
          <Plus className="h-4 w-4 mr-2" />
          New Automation
        </Button>
      </div>

      <div className="grid gap-4">
        <AnimatePresence>
          {automations.map((automation) => (
            <motion.div
              key={automation.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={automation.is_active}
                      onCheckedChange={(checked) => updateMutation.mutate({ id: automation.id, updates: { is_active: checked } })}
                    />
                    {editingId === automation.id ? (
                      <Input
                        value={automation.name}
                        onChange={(e) => updateMutation.mutate({ id: automation.id, updates: { name: e.target.value } })}
                        onBlur={() => setEditingId(null)}
                        className="h-8 w-48"
                        autoFocus
                      />
                    ) : (
                      <CardTitle
                        className="text-lg cursor-pointer hover:text-primary transition-colors"
                        onClick={() => setEditingId(automation.id)}
                      >
                        {automation.name}
                      </CardTitle>
                    )}
                    <Badge variant={automation.is_active ? 'default' : 'secondary'}>
                      {automation.is_active ? 'Active' : 'Paused'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      Ran {automation.run_count} times
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(automation.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Trigger Step */}
                    <div>
                      <div className={`p-3 rounded-lg border bg-primary/5 border-primary/20`}>
                        <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                          When (Trigger)
                        </Label>
                        <div className="mt-2 flex items-center gap-3">
                          <Select
                            value={automation.trigger_type}
                            onValueChange={(val) => handleUpdateTrigger(automation.id, val)}
                          >
                            <SelectTrigger className="w-48">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TRIGGER_OPTIONS.map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  <div className="flex items-center gap-2">
                                    <opt.icon className="h-4 w-4" />
                                    {opt.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {/* Config Inputs based on Trigger */}
                          {automation.trigger_type === 'stage_change' && (
                            <div className="flex items-center gap-2 text-sm">
                              <span>To:</span>
                              <Input
                                value={automation.trigger_config?.to || ''}
                                onChange={(e) => updateMutation.mutate({
                                  id: automation.id,
                                  updates: { trigger_config: { ...automation.trigger_config, to: e.target.value } }
                                })}
                                className="w-32 h-8"
                                placeholder="Stage Name"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-center py-2">
                      <ArrowDown className="h-4 w-4 text-muted-foreground" />
                    </div>

                    {/* Actions Steps */}
                    {automation.actions.map((action, idx) => (
                      <div key={idx}>
                        <div className={`p-3 rounded-lg border bg-accent/5 border-accent/20`}>
                          <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                            Then (Action)
                          </Label>
                          <div className="mt-2 flex items-center gap-3">
                            <Select
                              value={action.type}
                              onValueChange={(val) => handleUpdateAction(automation.id, idx, val)}
                            >
                              <SelectTrigger className="w-48">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ACTION_OPTIONS.map(opt => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    <div className="flex items-center gap-2">
                                      <opt.icon className="h-4 w-4" />
                                      {opt.label}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {/* Config Inputs based on Action */}
                            {action.type === 'create_task' && (
                              <Input
                                value={action.config?.subject || ''}
                                onChange={(e) => {
                                  const newActions = [...automation.actions];
                                  newActions[idx].config.subject = e.target.value;
                                  updateMutation.mutate({ id: automation.id, updates: { actions: newActions } });
                                }}
                                placeholder="Task Subject"
                                className="w-48 h-8"
                              />
                            )}
                            {action.type === 'notify_user' && (
                              <Input
                                value={action.config?.message || ''}
                                onChange={(e) => {
                                  const newActions = [...automation.actions];
                                  newActions[idx].config.message = e.target.value;
                                  updateMutation.mutate({ id: automation.id, updates: { actions: newActions } });
                                }}
                                placeholder="Message"
                                className="w-48 h-8"
                              />
                            )}
                            {action.type === 'ai_decision' && (
                              <div className="flex flex-col gap-2">
                                <Input
                                  value={action.config?.prompt || ''}
                                  onChange={(e) => {
                                    const newActions = [...automation.actions];
                                    newActions[idx].config.prompt = e.target.value;
                                    updateMutation.mutate({ id: automation.id, updates: { actions: newActions } });
                                  }}
                                  placeholder="AI Prompt (e.g. Is email angry?)"
                                  className="w-64 h-8 border-purple-200 focus:border-purple-400"
                                />
                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                  <BrainCircuit className="h-3 w-3" />
                                  Splits workflow based on Yes/No
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>

        {automations.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Zap className="mx-auto h-12 w-12 opacity-20 mb-4" />
            <p>No automations yet. Create one to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
}
