import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { 
  Target, Plus, Flame, Trophy, TrendingUp, Trash2, Sparkles 
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { UnifiedKPI } from '@/hooks/useUnifiedKPIs';

interface PersonalGoal {
  id: string;
  user_id: string;
  kpi_name: string;
  personal_target: number;
  official_target: number | null;
  current_value: number;
  streak_days: number;
  best_streak: number;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface PersonalKPIGoalsProps {
  availableKPIs?: UnifiedKPI[];
}

export function PersonalKPIGoals({ availableKPIs = [] }: PersonalKPIGoalsProps) {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<PersonalGoal | null>(null);
  const [formData, setFormData] = useState({
    kpi_name: '',
    personal_target: '',
    notes: ''
  });

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['personal-kpi-goals'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('personal_kpi_goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as PersonalGoal[];
    }
  });

  const createGoalMutation = useMutation({
    mutationFn: async (goalData: { kpi_name: string; personal_target: number; notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const kpi = availableKPIs.find(k => k.name === goalData.kpi_name);
      
      const { error } = await supabase
        .from('personal_kpi_goals')
        .insert({
          user_id: user.id,
          kpi_name: goalData.kpi_name,
          personal_target: goalData.personal_target,
          official_target: kpi?.targetValue || null,
          current_value: kpi?.value || 0,
          notes: goalData.notes || null
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-kpi-goals'] });
      setIsDialogOpen(false);
      resetForm();
      toast.success('Personal goal created');
    },
    onError: (error) => {
      toast.error('Failed to create goal: ' + error.message);
    }
  });

  const updateGoalMutation = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; personal_target?: number; notes?: string }) => {
      const { error } = await supabase
        .from('personal_kpi_goals')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-kpi-goals'] });
      setEditingGoal(null);
      toast.success('Goal updated');
    }
  });

  const deleteGoalMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('personal_kpi_goals')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-kpi-goals'] });
      toast.success('Goal removed');
    }
  });

  const resetForm = () => {
    setFormData({ kpi_name: '', personal_target: '', notes: '' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.kpi_name || !formData.personal_target) return;

    createGoalMutation.mutate({
      kpi_name: formData.kpi_name,
      personal_target: parseFloat(formData.personal_target),
      notes: formData.notes || undefined
    });
  };

  const getProgressPercent = (goal: PersonalGoal) => {
    if (!goal.personal_target) return 0;
    return Math.min(100, (goal.current_value / goal.personal_target) * 100);
  };

  const getKPIValue = (kpiName: string) => {
    const kpi = availableKPIs.find(k => k.name === kpiName);
    return kpi?.value || 0;
  };

  const availableForGoals = availableKPIs.filter(
    kpi => !goals.some(g => g.kpi_name === kpi.name)
  );

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Target className="h-5 w-5 text-accent" />
            Personal KPI Goals
          </CardTitle>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Add Goal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Set Personal KPI Goal</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Select KPI</Label>
                  <select
                    value={formData.kpi_name}
                    onChange={(e) => setFormData({ ...formData, kpi_name: e.target.value })}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    required
                  >
                    <option value="">Choose a KPI...</option>
                    {availableForGoals.map(kpi => (
                      <option key={kpi.id} value={kpi.name}>
                        {kpi.displayName} (Current: {kpi.value?.toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Personal Target</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Enter your target..."
                    value={formData.personal_target}
                    onChange={(e) => setFormData({ ...formData, personal_target: e.target.value })}
                    required
                  />
                  {formData.kpi_name && (
                    <p className="text-xs text-muted-foreground">
                      Official target: {availableKPIs.find(k => k.name === formData.kpi_name)?.targetValue?.toLocaleString() || 'N/A'}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Notes (optional)</Label>
                  <Textarea
                    placeholder="Why is this goal important to you?"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createGoalMutation.isPending}
                    className="bg-accent hover:bg-accent/90"
                  >
                    {createGoalMutation.isPending ? 'Creating...' : 'Create Goal'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {goals.length === 0 ? (
          <div className="text-center py-8">
            <Sparkles className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              No personal goals set yet
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Challenge yourself with custom KPI targets
            </p>
          </div>
        ) : (
          goals.map(goal => {
            const currentValue = getKPIValue(goal.kpi_name);
            const progress = (currentValue / goal.personal_target) * 100;
            const isComplete = progress >= 100;
            
            return (
              <div 
                key={goal.id} 
                className={`p-4 rounded-lg border transition-colors ${
                  isComplete 
                    ? 'bg-green-500/10 border-green-500/30' 
                    : 'bg-muted/30 border-border/50'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm">{goal.kpi_name}</h4>
                      {isComplete && (
                        <Badge variant="outline" className="bg-green-500/20 text-green-600 border-green-500/30 text-xs">
                          <Trophy className="h-3 w-3 mr-1" />
                          Achieved
                        </Badge>
                      )}
                    </div>
                    {goal.notes && (
                      <p className="text-xs text-muted-foreground mt-0.5">{goal.notes}</p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {goal.streak_days > 0 && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Flame className="h-3 w-3 text-orange-500" />
                        {goal.streak_days}d
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => deleteGoalMutation.mutate(goal.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {currentValue.toLocaleString()} / {goal.personal_target.toLocaleString()}
                    </span>
                    <span className={`font-medium ${isComplete ? 'text-green-500' : 'text-foreground'}`}>
                      {progress.toFixed(1)}%
                    </span>
                  </div>
                  <Progress 
                    value={Math.min(100, progress)} 
                    className={`h-2 ${isComplete ? '[&>div]:bg-green-500' : ''}`}
                  />
                </div>

                {goal.official_target && goal.personal_target > goal.official_target && (
                  <p className="text-xs text-accent mt-2 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    {((goal.personal_target / goal.official_target - 1) * 100).toFixed(0)}% above official target
                  </p>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
