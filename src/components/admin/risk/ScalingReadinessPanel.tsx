import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle, Circle, ArrowRight, Rocket, Users, Code, DollarSign, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface ChecklistItem {
  id: string;
  category: string;
  item: string;
  is_complete: boolean;
  completed_at: string | null;
  notes: string | null;
}

const categoryConfig: Record<string, { label: string; icon: typeof Code; color: string }> = {
  technology: { label: 'Technology', icon: Code, color: 'text-blue-500' },
  team: { label: 'Team', icon: Users, color: 'text-green-500' },
  process: { label: 'Process', icon: ArrowRight, color: 'text-purple-500' },
  finance: { label: 'Finance', icon: DollarSign, color: 'text-yellow-500' },
};

export function ScalingReadinessPanel() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch checklist from database
  const { data: checklist = [], isLoading } = useQuery({
    queryKey: ['scaling-readiness-checklist'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scaling_readiness_checklist')
        .select('*')
        .order('category', { ascending: true });
      if (error) throw error;
      return data as ChecklistItem[];
    },
  });

  // Toggle checklist item mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_complete }: { id: string; is_complete: boolean }) => {
      const { error } = await supabase
        .from('scaling_readiness_checklist')
        .update({
          is_complete,
          completed_at: is_complete ? new Date().toISOString() : null,
          completed_by: is_complete ? user?.id : null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scaling-readiness-checklist'] });
    },
    onError: (error) => toast.error('Failed to update: ' + error.message),
  });

  const getStatusIcon = (isComplete: boolean) => {
    return isComplete 
      ? <CheckCircle className="h-5 w-5 text-green-500" />
      : <Circle className="h-5 w-5 text-muted-foreground" />;
  };

  const categories = ['technology', 'team', 'process', 'finance'] as const;
  
  const getCategoryProgress = (category: string) => {
    const items = checklist.filter(i => i.category === category);
    if (items.length === 0) return 0;
    const complete = items.filter(i => i.is_complete).length;
    return Math.round((complete / items.length) * 100);
  };

  const overallProgress = checklist.length > 0
    ? Math.round((checklist.filter(i => i.is_complete).length / checklist.length) * 100)
    : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Progress */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/30">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Rocket className="h-8 w-8 text-primary" />
              <div>
                <h2 className="text-2xl font-bold">Scale Readiness Score</h2>
                <p className="text-muted-foreground">Overall preparation for 10x growth</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold text-primary">{overallProgress}%</p>
              <p className="text-sm text-muted-foreground">
                {checklist.filter(i => i.is_complete).length} / {checklist.length} items
              </p>
            </div>
          </div>
          <Progress value={overallProgress} className="h-3" />
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {categories.map((cat) => {
          const config = categoryConfig[cat];
          const Icon = config.icon;
          const progress = getCategoryProgress(cat);
          
          return (
            <Card key={cat}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`h-5 w-5 ${config.color}`} />
                  <span className="font-medium">{config.label}</span>
                </div>
                <p className="text-2xl font-bold mb-2">{progress}%</p>
                <Progress value={progress} className="h-2" />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detailed Checklist by Category */}
      {categories.map((cat) => {
        const config = categoryConfig[cat];
        const Icon = config.icon;
        const items = checklist.filter(i => i.category === cat);
        
        if (items.length === 0) return null;
        
        return (
          <Card key={cat}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Icon className={`h-5 w-5 ${config.color}`} />
                {config.label} Readiness
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {items.map((item) => (
                  <div 
                    key={item.id} 
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                      item.is_complete 
                        ? 'bg-green-500/5 border-green-500/30' 
                        : 'bg-muted/50 hover:bg-muted'
                    }`}
                    onClick={() => toggleMutation.mutate({ id: item.id, is_complete: !item.is_complete })}
                  >
                    <Checkbox
                      checked={item.is_complete}
                      onCheckedChange={(checked) => {
                        toggleMutation.mutate({ id: item.id, is_complete: !!checked });
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1">
                      <p className={`font-medium ${item.is_complete ? 'line-through text-muted-foreground' : ''}`}>
                        {item.item}
                      </p>
                      {item.completed_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Completed {new Date(item.completed_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <Badge variant={item.is_complete ? 'default' : 'outline'}>
                      {item.is_complete ? 'Complete' : 'Pending'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
