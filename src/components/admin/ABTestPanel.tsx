import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  FlaskConical,
  Trophy,
  TrendingUp,
  Pause,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const ABTestPanel: React.FC = () => {
  const { t } = useTranslation('admin');
  const queryClient = useQueryClient();

  const { data: variants, isLoading } = useQuery({
    queryKey: ['blog-ab-tests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_post_variants')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const pauseMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('blog_post_variants')
        .update({ is_active: false, ended_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-ab-tests'] });
      toast.success(t('abTest.testPaused', 'Test paused'));
    },
  });

  const activeTests = (variants || []).filter((v: any) => v.is_active);
  const completedTests = (variants || []).filter((v: any) => !v.is_active);
  const winnersFound = completedTests.filter((v: any) => v.winner).length;

  const avgLift = completedTests.length
    ? Math.round(
        completedTests.reduce((sum: number, v: any) => {
          if (!v.winner) return sum;
          const rateA = v.views_a > 0 ? v.conversions_a / v.views_a : 0;
          const rateB = v.views_b > 0 ? v.conversions_b / v.views_b : 0;
          const lift = Math.abs(rateA - rateB) / Math.max(rateA, rateB, 0.001) * 100;
          return sum + lift;
        }, 0) / completedTests.length
      )
    : 0;

  const conversionRate = (conversions: number, views: number) => {
    if (views === 0) return '0%';
    return `${((conversions / views) * 100).toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <FlaskConical className="h-8 w-8 text-blue-400" />
            <div>
              <p className="text-xs text-muted-foreground uppercase">{t('abTest.activeTests', 'Active Tests')}</p>
              <p className="text-2xl font-semibold">{activeTests.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <Trophy className="h-8 w-8 text-amber-400" />
            <div>
              <p className="text-xs text-muted-foreground uppercase">{t('abTest.winnersFound', 'Winners Found')}</p>
              <p className="text-2xl font-semibold">{winnersFound}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-emerald-400" />
            <div>
              <p className="text-xs text-muted-foreground uppercase">{t('abTest.avgLift', 'Avg Lift')}</p>
              <p className="text-2xl font-semibold">{avgLift}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Active Tests */}
          {activeTests.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('abTest.activeTests', 'Active Tests')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activeTests.map((test: any) => (
                    <div key={test.id} className="p-4 rounded-lg border border-border space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="capitalize">{test.variant_type}</Badge>
                        <Button size="sm" variant="ghost" onClick={() => pauseMutation.mutate(test.id)}>
                          <Pause className="h-4 w-4 mr-1" /> {t('abTest.pause', 'Pause')}
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">{t('abTest.variantA', 'Variant A')}</p>
                          <p className="text-sm font-medium truncate">{test.variant_a}</p>
                          <p className="text-xs text-muted-foreground">
                            {test.views_a} views · {conversionRate(test.conversions_a, test.views_a)} CVR
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">{t('abTest.variantB', 'Variant B')}</p>
                          <p className="text-sm font-medium truncate">{test.variant_b}</p>
                          <p className="text-xs text-muted-foreground">
                            {test.views_b} views · {conversionRate(test.conversions_b, test.views_b)} CVR
                          </p>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{t('abTest.confidence', 'Confidence')}</span>
                          <span>{Number(test.confidence || 0).toFixed(0)}%</span>
                        </div>
                        <Progress value={Number(test.confidence || 0)} className="h-1.5" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Completed Tests */}
          {completedTests.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('abTest.completedTests', 'Completed Tests')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {completedTests.map((test: any) => {
                    const rateA = test.views_a > 0 ? test.conversions_a / test.views_a : 0;
                    const rateB = test.views_b > 0 ? test.conversions_b / test.views_b : 0;
                    const lift = Math.abs(rateA - rateB) / Math.max(rateA, rateB, 0.001) * 100;

                    return (
                      <div key={test.id} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                        <Badge variant="outline" className="capitalize">{test.variant_type}</Badge>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {t('abTest.winner', 'Winner')}: {test.winner === 'a' ? test.variant_a : test.variant_b}
                          </p>
                        </div>
                        <Badge className="bg-emerald-500/10 text-emerald-500">+{lift.toFixed(1)}% lift</Badge>
                        <span className="text-xs text-muted-foreground">
                          {Number(test.confidence || 0).toFixed(0)}% conf
                        </span>
                        {test.ended_at && (
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(test.ended_at), 'MMM d')}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {!variants?.length && (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">{t('abTest.noTests', 'No A/B tests yet. Tests are created automatically when the engine generates headline or CTA variants.')}</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default ABTestPanel;
