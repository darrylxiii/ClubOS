import { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, Plus, Trash2, ArrowRight, Mail, MessageSquare, Calendar, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

interface AutomationRule {
  id: string;
  name: string;
  trigger: string;
  action: string;
  enabled: boolean;
}

const defaultRules: AutomationRule[] = [
  { id: '1', name: 'Auto-advance on reply', trigger: 'prospect_replied', action: 'move_to_replied', enabled: true },
  { id: '2', name: 'Hot lead notification', trigger: 'classification_hot', action: 'notify_owner', enabled: true },
  { id: '3', name: 'Create follow-up task', trigger: 'prospect_replied', action: 'create_task', enabled: false },
  { id: '4', name: 'Book meeting on positive', trigger: 'sentiment_positive', action: 'suggest_meeting', enabled: false },
];

const triggers = [
  { value: 'prospect_replied', label: 'Prospect Replied', icon: MessageSquare },
  { value: 'email_opened', label: 'Email Opened', icon: Mail },
  { value: 'classification_hot', label: 'Classified as Hot', icon: Zap },
  { value: 'sentiment_positive', label: 'Positive Sentiment', icon: UserCheck },
];

const actions = [
  { value: 'move_to_replied', label: 'Move to Replied Stage' },
  { value: 'notify_owner', label: 'Notify Owner' },
  { value: 'create_task', label: 'Create Follow-up Task' },
  { value: 'suggest_meeting', label: 'Suggest Meeting' },
  { value: 'send_email', label: 'Send Auto Email' },
];

export function PipelineAutomationRules() {
  const [rules, setRules] = useState<AutomationRule[]>(defaultRules);
  const [isAdding, setIsAdding] = useState(false);
  const [newRule, setNewRule] = useState({ trigger: '', action: '' });

  const toggleRule = (id: string) => {
    setRules(prev => prev.map(rule => 
      rule.id === id ? { ...rule, enabled: !rule.enabled } : rule
    ));
    toast.success('Rule updated');
  };

  const deleteRule = (id: string) => {
    setRules(prev => prev.filter(rule => rule.id !== id));
    toast.success('Rule deleted');
  };

  const addRule = () => {
    if (!newRule.trigger || !newRule.action) {
      toast.error('Please select both trigger and action');
      return;
    }

    const trigger = triggers.find(t => t.value === newRule.trigger);
    const action = actions.find(a => a.value === newRule.action);

    setRules(prev => [...prev, {
      id: Date.now().toString(),
      name: `${trigger?.label} → ${action?.label}`,
      trigger: newRule.trigger,
      action: newRule.action,
      enabled: true
    }]);

    setNewRule({ trigger: '', action: '' });
    setIsAdding(false);
    toast.success('Rule created');
  };

  return (
    <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-500" />
          Automation Rules
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsAdding(true)}
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Rule
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="p-4 bg-primary/5 rounded-lg border border-primary/20 space-y-3"
          >
            <div className="flex items-center gap-3">
              <Select value={newRule.trigger} onValueChange={(v) => setNewRule(p => ({ ...p, trigger: v }))}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="When..." />
                </SelectTrigger>
                <SelectContent>
                  {triggers.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      <div className="flex items-center gap-2">
                        <t.icon className="w-4 h-4" />
                        {t.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />

              <Select value={newRule.action} onValueChange={(v) => setNewRule(p => ({ ...p, action: v }))}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Then..." />
                </SelectTrigger>
                <SelectContent>
                  {actions.map(a => (
                    <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)}>Cancel</Button>
              <Button size="sm" onClick={addRule}>Create Rule</Button>
            </div>
          </motion.div>
        )}

        {rules.map((rule, index) => (
          <motion.div
            key={rule.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Switch
                checked={rule.enabled}
                onCheckedChange={() => toggleRule(rule.id)}
              />
              <span className="text-sm text-foreground">{rule.name}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => deleteRule(rule.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </motion.div>
        ))}

        {rules.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No automation rules configured
          </div>
        )}
      </CardContent>
    </Card>
  );
}
