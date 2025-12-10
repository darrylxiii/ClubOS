import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Plus, Trash2, Zap, Save, Play, Pause, ArrowDown, 
  Mail, Bell, UserPlus, Tag, Clock, MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';

interface AutomationStep {
  id: string;
  type: 'trigger' | 'condition' | 'action';
  config: Record<string, string>;
}

interface Automation {
  id: string;
  name: string;
  isActive: boolean;
  steps: AutomationStep[];
  lastRun?: string;
  runCount: number;
}

const TRIGGER_OPTIONS = [
  { value: 'stage_change', label: 'Stage Changed', icon: Tag },
  { value: 'reply_received', label: 'Reply Received', icon: MessageSquare },
  { value: 'no_activity', label: 'No Activity For X Days', icon: Clock },
  { value: 'score_threshold', label: 'Score Reaches Threshold', icon: Zap },
];

const ACTION_OPTIONS = [
  { value: 'send_email', label: 'Send Email', icon: Mail },
  { value: 'create_task', label: 'Create Task', icon: Plus },
  { value: 'notify_user', label: 'Notify User', icon: Bell },
  { value: 'assign_owner', label: 'Assign Owner', icon: UserPlus },
  { value: 'update_stage', label: 'Update Stage', icon: Tag },
];

export function CRMAutomationBuilder() {
  const [automations, setAutomations] = useState<Automation[]>([
    {
      id: '1',
      name: 'Hot Lead Alert',
      isActive: true,
      steps: [
        { id: '1a', type: 'trigger', config: { trigger: 'score_threshold', value: '70' } },
        { id: '1b', type: 'action', config: { action: 'notify_user', message: 'Hot lead detected!' } },
      ],
      lastRun: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      runCount: 24,
    },
    {
      id: '2',
      name: 'Follow-up Reminder',
      isActive: true,
      steps: [
        { id: '2a', type: 'trigger', config: { trigger: 'no_activity', value: '3' } },
        { id: '2b', type: 'action', config: { action: 'create_task', message: 'Follow up with prospect' } },
      ],
      lastRun: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      runCount: 156,
    },
  ]);

  const [editingId, setEditingId] = useState<string | null>(null);

  const toggleAutomation = (id: string) => {
    setAutomations(automations.map(a => 
      a.id === id ? { ...a, isActive: !a.isActive } : a
    ));
    const automation = automations.find(a => a.id === id);
    toast.success(`${automation?.name} ${automation?.isActive ? 'paused' : 'activated'}`);
  };

  const addAutomation = () => {
    const newAutomation: Automation = {
      id: Date.now().toString(),
      name: 'New Automation',
      isActive: false,
      steps: [
        { id: `${Date.now()}-trigger`, type: 'trigger', config: { trigger: 'stage_change' } },
        { id: `${Date.now()}-action`, type: 'action', config: { action: 'notify_user' } },
      ],
      runCount: 0,
    };
    setAutomations([...automations, newAutomation]);
    setEditingId(newAutomation.id);
  };

  const deleteAutomation = (id: string) => {
    setAutomations(automations.filter(a => a.id !== id));
    toast.success('Automation deleted');
  };

  const updateAutomationName = (id: string, name: string) => {
    setAutomations(automations.map(a => 
      a.id === id ? { ...a, name } : a
    ));
  };

  const updateStep = (automationId: string, stepId: string, config: Record<string, string>) => {
    setAutomations(automations.map(a => 
      a.id === automationId 
        ? { ...a, steps: a.steps.map(s => s.id === stepId ? { ...s, config: { ...s.config, ...config } } : s) }
        : a
    ));
  };

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
        <Button onClick={addAutomation}>
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
                      checked={automation.isActive}
                      onCheckedChange={() => toggleAutomation(automation.id)}
                    />
                    {editingId === automation.id ? (
                      <Input
                        value={automation.name}
                        onChange={(e) => updateAutomationName(automation.id, e.target.value)}
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
                    <Badge variant={automation.isActive ? 'default' : 'secondary'}>
                      {automation.isActive ? 'Active' : 'Paused'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      Ran {automation.runCount} times
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteAutomation(automation.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {automation.steps.map((step, index) => (
                      <div key={step.id}>
                        {index > 0 && (
                          <div className="flex justify-center py-2">
                            <ArrowDown className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className={`p-3 rounded-lg border ${
                          step.type === 'trigger' 
                            ? 'bg-primary/5 border-primary/20' 
                            : 'bg-accent/5 border-accent/20'
                        }`}>
                          <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                            {step.type === 'trigger' ? 'When' : 'Then'}
                          </Label>
                          <div className="mt-2 flex items-center gap-3">
                            <Select
                              value={step.config.trigger || step.config.action}
                              onValueChange={(value) => 
                                updateStep(automation.id, step.id, 
                                  step.type === 'trigger' ? { trigger: value } : { action: value }
                                )
                              }
                            >
                              <SelectTrigger className="w-48">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {(step.type === 'trigger' ? TRIGGER_OPTIONS : ACTION_OPTIONS).map(opt => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    <div className="flex items-center gap-2">
                                      <opt.icon className="h-4 w-4" />
                                      {opt.label}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {(step.config.trigger === 'no_activity' || step.config.trigger === 'score_threshold') && (
                              <Input
                                value={step.config.value || ''}
                                onChange={(e) => updateStep(automation.id, step.id, { value: e.target.value })}
                                placeholder={step.config.trigger === 'no_activity' ? 'Days' : 'Score'}
                                className="w-24"
                              />
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
      </div>
    </div>
  );
}
