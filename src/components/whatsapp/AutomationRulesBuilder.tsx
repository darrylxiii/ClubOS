import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/lib/notify';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Zap, Trash2, ArrowRight } from 'lucide-react';

interface AutomationRule {
  id: string;
  name: string;
  trigger_type: string;
  trigger_config: Record<string, unknown>;
  action_type: string;
  action_config: Record<string, unknown>;
  is_active: boolean;
}

export function AutomationRulesBuilder() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [newRule, setNewRule] = useState({
    name: '',
    trigger_type: 'keyword',
    trigger_config: { keywords: [] as string[] },
    action_type: 'send_template',
    action_config: { template_name: '' },
  });

  const { data: rules } = useQuery({
    queryKey: ['whatsapp-automation-rules'],
    queryFn: async () => {
      const { data } = await supabase
        .from('whatsapp_automation_rules')
        .select('*')
        .order('created_at', { ascending: false });
      return data as AutomationRule[] || [];
    },
  });

  const createRuleMutation = useMutation({
    mutationFn: async (rule: typeof newRule) => {
      const { error } = await supabase
        .from('whatsapp_automation_rules')
        .insert({
          name: rule.name,
          trigger_type: rule.trigger_type,
          trigger_config: rule.trigger_config,
          action_type: rule.action_type,
          action_config: rule.action_config,
          is_active: true,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-automation-rules'] });
      toast({ title: 'Automation rule created' });
      setIsOpen(false);
      setNewRule({
        name: '',
        trigger_type: 'keyword',
        trigger_config: { keywords: [] },
        action_type: 'send_template',
        action_config: { template_name: '' },
      });
    },
    onError: () => {
      toast({ title: 'Failed to create rule', variant: 'destructive' });
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('whatsapp_automation_rules')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-automation-rules'] });
      toast({ title: 'Rule deleted' });
    },
  });

  const toggleRuleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('whatsapp_automation_rules')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-automation-rules'] });
    },
  });

  const triggerTypes = [
    { value: 'keyword', label: 'Keyword Match' },
    { value: 'intent', label: 'Intent Detection' },
    { value: 'no_response', label: 'No Response (timeout)' },
    { value: 'new_conversation', label: 'New Conversation' },
  ];

  const actionTypes = [
    { value: 'send_template', label: 'Send Template' },
    { value: 'assign_strategist', label: 'Assign Strategist' },
    { value: 'create_task', label: 'Create Club Pilot Task' },
    { value: 'add_tag', label: 'Add Tag' },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Automation Rules
          </CardTitle>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Rule
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Automation Rule</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Rule Name</Label>
                  <Input
                    value={newRule.name}
                    onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                    placeholder="e.g., Auto-reply to interested candidates"
                  />
                </div>

                <div>
                  <Label>Trigger</Label>
                  <Select
                    value={newRule.trigger_type}
                    onValueChange={(value) => setNewRule({ ...newRule, trigger_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {triggerTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {newRule.trigger_type === 'keyword' && (
                  <div>
                    <Label>Keywords (comma-separated)</Label>
                    <Input
                      placeholder="interested, yes, schedule"
                      onChange={(e) => setNewRule({
                        ...newRule,
                        trigger_config: { keywords: e.target.value.split(',').map(k => k.trim()) },
                      })}
                    />
                  </div>
                )}

                <div>
                  <Label>Action</Label>
                  <Select
                    value={newRule.action_type}
                    onValueChange={(value) => setNewRule({ ...newRule, action_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {actionTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {newRule.action_type === 'send_template' && (
                  <div>
                    <Label>Template Name</Label>
                    <Input
                      value={(newRule.action_config as { template_name?: string }).template_name || ''}
                      onChange={(e) => setNewRule({
                        ...newRule,
                        action_config: { template_name: e.target.value },
                      })}
                      placeholder="interview_confirmation"
                    />
                  </div>
                )}

                <Button
                  className="w-full"
                  onClick={() => createRuleMutation.mutate(newRule)}
                  disabled={!newRule.name || createRuleMutation.isPending}
                >
                  Create Rule
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {rules?.map((rule) => (
            <div key={rule.id} className="flex items-center gap-4 p-4 rounded-lg border bg-card">
              <div className="flex-1">
                <p className="font-medium">{rule.name}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <span className="px-2 py-0.5 rounded bg-muted">{rule.trigger_type}</span>
                  <ArrowRight className="h-3 w-3" />
                  <span className="px-2 py-0.5 rounded bg-muted">{rule.action_type}</span>
                </div>
              </div>
              <Switch
                checked={rule.is_active}
                onCheckedChange={(checked) => toggleRuleMutation.mutate({ id: rule.id, is_active: checked })}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteRuleMutation.mutate(rule.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          {(!rules || rules.length === 0) && (
            <p className="text-center text-muted-foreground py-8">
              No automation rules yet. Create one to automate responses.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
