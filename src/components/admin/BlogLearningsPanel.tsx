import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Brain,
  TrendingUp,
  Search as SearchIcon,
  MousePointerClick,
  Clock,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

const LEARNING_TYPE_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  content: { icon: <Brain className="h-4 w-4" />, label: 'Content', color: 'text-blue-400' },
  seo: { icon: <SearchIcon className="h-4 w-4" />, label: 'SEO', color: 'text-emerald-400' },
  engagement: { icon: <MousePointerClick className="h-4 w-4" />, label: 'Engagement', color: 'text-amber-400' },
  timing: { icon: <Clock className="h-4 w-4" />, label: 'Timing', color: 'text-purple-400' },
};

const BlogLearningsPanel: React.FC = () => {
  const { t } = useTranslation('admin');
  const queryClient = useQueryClient();

  const { data: learnings, isLoading } = useQuery({
    queryKey: ['blog-learnings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_learnings' as any)
        .select('*')
        .order('confidence_score', { ascending: false });

      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('blog_learnings' as any)
        .update({ is_active } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-learnings'] });
      toast.success(t('blogLearnings.learningUpdated', 'Learning updated'));
    },
  });

  const totalInsights = learnings?.length || 0;
  const activeCount = learnings?.filter((l: any) => l.is_active).length || 0;
  const avgConfidence = totalInsights
    ? Math.round((learnings || []).reduce((sum: number, l: any) => sum + (l.confidence_score || 0), 0) / totalInsights)
    : 0;
  const timesApplied = (learnings || []).reduce((sum: number, l: any) => sum + (l.times_applied || 0), 0);

  const grouped = (learnings || []).reduce((acc: Record<string, any[]>, l: any) => {
    const type = l.learning_type || 'content';
    if (!acc[type]) acc[type] = [];
    acc[type].push(l);
    return acc;
  }, {});

  const confidenceDots = (score: number) => {
    const filled = Math.round(score / 20);
    return (
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < filled ? 'bg-accent' : 'bg-muted'}`} />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('blogLearnings.totalInsights', 'Total Insights')}</p>
            <p className="text-2xl font-semibold text-foreground mt-1">{totalInsights}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('blogLearnings.active', 'Active')}</p>
            <p className="text-2xl font-semibold text-foreground mt-1">{activeCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('blogLearnings.avgConfidence', 'Avg Confidence')}</p>
            <p className="text-2xl font-semibold text-foreground mt-1">{avgConfidence}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('blogLearnings.timesApplied', 'Times Applied')}</p>
            <p className="text-2xl font-semibold text-foreground mt-1">{timesApplied}</p>
          </CardContent>
        </Card>
      </div>

      {/* Learnings grouped by type */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !totalInsights ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">{t('blogLearnings.noLearnings', 'No learnings yet. The engine discovers patterns as it generates and analyzes content.')}</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([type, items]) => {
          const config = LEARNING_TYPE_CONFIG[type] || LEARNING_TYPE_CONFIG.content;
          return (
            <Card key={type}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className={config.color}>{config.icon}</span>
                  {config.label} {t('blogLearnings.insights', 'Insights')}
                  <Badge variant="outline" className="ml-auto">{(items as any[]).length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(items as any[]).map((learning: any) => (
                    <div key={learning.id} className="flex items-start gap-3 p-3 rounded-lg border border-border">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{learning.insight}</p>
                        {learning.evidence && (
                          <p className="text-xs text-muted-foreground mt-1">{learning.evidence}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          {confidenceDots(learning.confidence_score || 0)}
                          <span className="text-xs text-muted-foreground">{learning.confidence_score}% {t('blogLearnings.confidence', 'confidence')}</span>
                          {learning.times_applied > 0 && (
                            <span className="text-xs text-muted-foreground">{t('blogLearnings.appliedCount', 'Applied {{count}}x', { count: learning.times_applied })}</span>
                          )}
                        </div>
                      </div>
                      <Switch
                        checked={learning.is_active}
                        onCheckedChange={(v) => toggleMutation.mutate({ id: learning.id, is_active: v })}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
};

export default BlogLearningsPanel;
