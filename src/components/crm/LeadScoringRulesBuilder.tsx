import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Plus, Trash2, GripVertical, Zap, Save, Eye } from 'lucide-react';
import { toast } from 'sonner';

interface ScoringRule {
  id: string;
  field: string;
  operator: string;
  value: string;
  score: number;
  isActive: boolean;
}

const FIELD_OPTIONS = [
  { value: 'email_opens', label: 'Email Opens' },
  { value: 'email_clicks', label: 'Email Clicks' },
  { value: 'reply_count', label: 'Reply Count' },
  { value: 'company_size', label: 'Company Size' },
  { value: 'industry', label: 'Industry' },
  { value: 'title', label: 'Job Title' },
  { value: 'days_in_stage', label: 'Days in Stage' },
  { value: 'reply_sentiment', label: 'Reply Sentiment' },
];

const OPERATOR_OPTIONS = [
  { value: 'equals', label: 'Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than', label: 'Less Than' },
  { value: 'is_not_empty', label: 'Is Not Empty' },
];

export function LeadScoringRulesBuilder() {
  const [rules, setRules] = useState<ScoringRule[]>([
    { id: '1', field: 'email_opens', operator: 'greater_than', value: '3', score: 10, isActive: true },
    { id: '2', field: 'reply_count', operator: 'greater_than', value: '0', score: 25, isActive: true },
    { id: '3', field: 'title', operator: 'contains', value: 'CEO', score: 20, isActive: true },
    { id: '4', field: 'company_size', operator: 'contains', value: '1000+', score: 15, isActive: true },
  ]);
  const [previewScore, setPreviewScore] = useState<number | null>(null);

  const addRule = () => {
    const newRule: ScoringRule = {
      id: Date.now().toString(),
      field: 'email_opens',
      operator: 'greater_than',
      value: '',
      score: 5,
      isActive: true,
    };
    setRules([...rules, newRule]);
  };

  const updateRule = (id: string, updates: Partial<ScoringRule>) => {
    setRules(rules.map(rule => rule.id === id ? { ...rule, ...updates } : rule));
  };

  const deleteRule = (id: string) => {
    setRules(rules.filter(rule => rule.id !== id));
  };

  const handleSave = () => {
    toast.success('Scoring rules saved successfully');
  };

  const handlePreview = () => {
    const activeRules = rules.filter(r => r.isActive);
    const totalScore = activeRules.reduce((sum, r) => sum + r.score, 0);
    setPreviewScore(totalScore);
    toast.info(`Maximum possible score: ${totalScore} points`);
  };

  const totalMaxScore = rules.filter(r => r.isActive).reduce((sum, r) => sum + r.score, 0);

  return (
    <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Lead Scoring Rules
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Configure how prospect scores are calculated
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            Max Score: {totalMaxScore}
          </Badge>
          <Button variant="outline" size="sm" onClick={handlePreview}>
            <Eye className="h-4 w-4 mr-1" />
            Preview
          </Button>
          <Button size="sm" onClick={handleSave}>
            <Save className="h-4 w-4 mr-1" />
            Save Rules
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <AnimatePresence>
          {rules.map((rule, index) => (
            <motion.div
              key={rule.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-3 p-4 rounded-lg bg-background/50 border border-border/30"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
              
              <div className="flex-1 grid grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Field</Label>
                  <Select
                    value={rule.field}
                    onValueChange={(value) => updateRule(rule.id, { field: value })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FIELD_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Operator</Label>
                  <Select
                    value={rule.operator}
                    onValueChange={(value) => updateRule(rule.id, { operator: value })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OPERATOR_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Value</Label>
                  <Input
                    value={rule.value}
                    onChange={(e) => updateRule(rule.id, { value: e.target.value })}
                    placeholder="Enter value"
                    className="h-9"
                  />
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Score (+{rule.score})</Label>
                  <Slider
                    value={[rule.score]}
                    onValueChange={([value]) => updateRule(rule.id, { score: value })}
                    max={50}
                    min={1}
                    step={1}
                    className="mt-3"
                  />
                </div>
              </div>

              <Switch
                checked={rule.isActive}
                onCheckedChange={(checked) => updateRule(rule.id, { isActive: checked })}
              />

              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteRule(rule.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </motion.div>
          ))}
        </AnimatePresence>

        <Button variant="outline" onClick={addRule} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add Scoring Rule
        </Button>

        {previewScore !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4 rounded-lg bg-primary/10 border border-primary/20 text-center"
          >
            <p className="text-sm text-muted-foreground">Maximum Achievable Score</p>
            <p className="text-3xl font-bold text-primary">{previewScore}</p>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
