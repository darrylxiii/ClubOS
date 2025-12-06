import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Lightbulb, Target, Zap, Clock, TrendingUp } from 'lucide-react';
import { useKPIActions, useKPIOwnership } from '@/hooks/useKPIOwnership';
import { useAuth } from '@/contexts/AuthContext';
import { format, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { UnifiedKPI } from '@/hooks/useUnifiedKPIs';

interface KPIActionPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kpi: UnifiedKPI | null;
}

// AI-generated action suggestions based on KPI type
const getActionSuggestions = (kpi: UnifiedKPI | null): string[] => {
  if (!kpi) return [];
  
  const suggestions: Record<string, string[]> = {
    cpl: [
      'Review and pause underperforming ad campaigns',
      'A/B test landing page headlines and CTAs',
      'Optimize audience targeting based on conversion data',
      'Implement retargeting for high-intent visitors',
    ],
    conversion_rate: [
      'Simplify the signup/application form',
      'Add social proof and testimonials',
      'Implement exit-intent popup with incentive',
      'Speed up page load time below 2 seconds',
    ],
    time_to_hire: [
      'Reduce interview rounds for specific roles',
      'Implement async video interviews',
      'Create templated interview scorecards',
      'Set up automated candidate reminders',
    ],
    nps: [
      'Follow up with detractors within 24 hours',
      'Identify and address common pain points',
      'Implement quick wins from feedback',
      'Create VIP experience for promoters',
    ],
    churn_rate: [
      'Implement early warning detection system',
      'Create re-engagement email campaign',
      'Offer personalized incentives to at-risk users',
      'Schedule proactive check-in calls',
    ],
  };

  // Match by KPI name or return generic suggestions
  const kpiKey = kpi.name.toLowerCase().replace(/[^a-z]/g, '_');
  return suggestions[kpiKey] || [
    'Identify root cause through data analysis',
    'Set up monitoring alerts for early detection',
    'Create weekly review cadence',
    'Document current baseline and target',
  ];
};

export function KPIActionPlanDialog({ open, onOpenChange, kpi }: KPIActionPlanDialogProps) {
  const { user } = useAuth();
  const { createAction, isCreating } = useKPIActions();
  const { getOwnerForKPI } = useKPIOwnership();
  
  const [actionDescription, setActionDescription] = useState('');
  const [actionType, setActionType] = useState('immediate');
  const [dueDate, setDueDate] = useState<Date | undefined>(addDays(new Date(), 7));

  const ownership = kpi ? getOwnerForKPI(kpi.name) : undefined;
  const ownerId = ownership?.owner_user_id || user?.id;
  const suggestions = getActionSuggestions(kpi);

  const handleCreate = () => {
    if (!kpi || !actionDescription.trim() || !ownerId) return;
    
    createAction({
      kpiName: kpi.name,
      ownerId,
      actionDescription: actionDescription.trim(),
      actionType,
      dueDate: dueDate?.toISOString(),
    });
    
    // Reset form
    setActionDescription('');
    setActionType('immediate');
    setDueDate(addDays(new Date(), 7));
    onOpenChange(false);
  };

  const selectSuggestion = (suggestion: string) => {
    setActionDescription(suggestion);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Create Action Plan
          </DialogTitle>
          {kpi && (
            <DialogDescription className="flex items-center gap-2">
              <Badge 
                variant="outline" 
                className={cn(
                  kpi.status === 'critical' && 'text-rose-600 border-rose-600/30',
                  kpi.status === 'warning' && 'text-amber-600 border-amber-600/30',
                  kpi.status === 'success' && 'text-emerald-600 border-emerald-600/30'
                )}
              >
                {kpi.status}
              </Badge>
              {kpi.displayName} • Current: {typeof kpi.value === 'number' ? kpi.value.toFixed(1) : kpi.value}
              {kpi.targetValue && ` → Target: ${kpi.targetValue}`}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* AI Suggestions */}
          {suggestions.length > 0 && (
            <Card className="bg-muted/30 border-dashed">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium">QUIN Suggestions</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {suggestions.slice(0, 4).map((suggestion, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      className="text-xs h-auto py-1.5 px-2 text-left whitespace-normal"
                      onClick={() => selectSuggestion(suggestion)}
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Description */}
          <div className="space-y-2">
            <Label>Action Description *</Label>
            <Textarea
              placeholder="What specific action will you take to improve this KPI?"
              value={actionDescription}
              onChange={(e) => setActionDescription(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Action Type & Due Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={actionType} onValueChange={setActionType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">
                    <div className="flex items-center gap-2">
                      <Zap className="h-3 w-3 text-rose-500" />
                      Immediate (24-48h)
                    </div>
                  </SelectItem>
                  <SelectItem value="short_term">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3 text-amber-500" />
                      Short-term (1-2 weeks)
                    </div>
                  </SelectItem>
                  <SelectItem value="strategic">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-3 w-3 text-blue-500" />
                      Strategic (1+ month)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !dueDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Owner Info */}
          {ownership?.owner_profile && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Owner:</span>
              <span className="font-medium text-foreground">
                {ownership.owner_profile.full_name || ownership.owner_profile.email}
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreate} 
            disabled={!actionDescription.trim() || isCreating}
            className="gap-1"
          >
            <Target className="h-4 w-4" />
            {isCreating ? 'Creating...' : 'Create Action Plan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
