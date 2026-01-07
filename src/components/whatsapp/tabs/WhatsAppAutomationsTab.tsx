import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Zap, MessageSquare, Clock, Bot, Settings } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AutomationRulesBuilder } from '@/components/whatsapp/AutomationRulesBuilder';
import { notify } from '@/lib/notify';

export function WhatsAppAutomationsTab() {
  const [showBuilder, setShowBuilder] = useState(false);
  const queryClient = useQueryClient();

  const { data: rules, isLoading } = useQuery({
    queryKey: ['whatsapp-automation-rules'],
    queryFn: async () => {
      const { data } = await supabase
        .from('whatsapp_automation_rules')
        .select('*')
        .order('created_at', { ascending: false });
      return data || [];
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
      notify.success('Automation rule updated');
    },
    onError: () => {
      notify.error('Failed to update rule');
    },
  });

  const getTriggerIcon = (triggerType: string) => {
    switch (triggerType) {
      case 'keyword': return MessageSquare;
      case 'time_based': return Clock;
      case 'event': return Zap;
      default: return Bot;
    }
  };

  const activeRules = rules?.filter(r => r.is_active).length || 0;
  const totalExecutions = rules?.reduce((sum, r) => sum + (r.execution_count || 0), 0) || 0;

  if (showBuilder) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={() => setShowBuilder(false)} className="mb-4">
          ← Back to Automations
        </Button>
        <AutomationRulesBuilder />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Automation Rules</h2>
          <p className="text-sm text-muted-foreground">Automate responses and actions based on triggers</p>
        </div>
        <Button onClick={() => setShowBuilder(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Automation
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{rules?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Total Rules</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Bot className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeRules}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <MessageSquare className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalExecutions}</p>
                <p className="text-xs text-muted-foreground">Executions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {rules?.filter(r => r.trigger_type === 'time_based').length || 0}
                </p>
                <p className="text-xs text-muted-foreground">Scheduled</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rules List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Automation Rules</CardTitle>
          <CardDescription>Manage your automated WhatsApp workflows</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-muted/50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : rules && rules.length > 0 ? (
            <div className="space-y-3">
              {rules.map((rule) => {
                const TriggerIcon = getTriggerIcon(rule.trigger_type);
                return (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="p-2 rounded-lg bg-muted">
                        <TriggerIcon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium truncate">{rule.name}</h3>
                          <Badge variant="outline" className="text-xs">
                            {rule.trigger_type}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {rule.description || `Action: ${rule.action_type}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right text-sm">
                        <p className="font-medium">{rule.execution_count || 0}</p>
                        <p className="text-muted-foreground">runs</p>
                      </div>
                      <Switch
                        checked={rule.is_active}
                        onCheckedChange={(checked) => 
                          toggleRuleMutation.mutate({ id: rule.id, is_active: checked })
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Bot className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-medium mb-2">No automation rules yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create rules to automatically respond to messages or trigger actions
              </p>
              <Button onClick={() => setShowBuilder(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Rule
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Tips */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Settings className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium mb-1">Automation Tips</p>
              <ul className="text-muted-foreground space-y-1">
                <li>• Use keyword triggers for FAQ responses</li>
                <li>• Set up time-based rules for follow-up reminders</li>
                <li>• Combine with templates for consistent messaging</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
