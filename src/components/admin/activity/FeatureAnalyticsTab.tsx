import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useRecharts } from '@/hooks/useRecharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export function FeatureAnalyticsTab() {
  const { recharts, isLoading: chartsLoading } = useRecharts();
  const { data: featureUsage, isLoading } = useQuery({
    queryKey: ['feature-usage-analytics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_feature_usage')
        .select('*')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000,
  });

  // Aggregate by feature
  const featureStats = featureUsage?.reduce((acc, usage) => {
    const key = usage.feature_name;
    if (!acc[key]) {
      acc[key] = {
        name: usage.feature_name,
        category: usage.feature_category,
        uses: 0,
        completions: 0,
        avgDuration: 0,
        totalDuration: 0,
        users: new Set(),
      };
    }
    
    acc[key].uses++;
    if (usage.completed) acc[key].completions++;
    if (usage.duration_ms) {
      acc[key].totalDuration += usage.duration_ms;
      acc[key].avgDuration = acc[key].totalDuration / acc[key].uses;
    }
    acc[key].users.add(usage.user_id);
    
    return acc;
  }, {} as Record<string, any>);

  const topFeatures = Object.values(featureStats || {})
    .sort((a: any, b: any) => b.uses - a.uses)
    .slice(0, 10)
    .map((feature: any, index) => ({
      ...feature,
      uniqueUsers: feature.users.size,
      completionRate: (feature.completions / feature.uses) * 100,
      avgDurationSec: Math.round(feature.avgDuration / 1000),
      color: `hsl(var(--chart-${(index % 5) + 1}))`,
    }));

  const categoryUsage = Object.values(featureStats || {}).reduce((acc: any, feature: any) => {
    const cat = feature.category;
    acc[cat] = (acc[cat] || 0) + feature.uses;
    return acc;
  }, {});

  const categoryChartData = Object.entries(categoryUsage)
    .sort((a: any, b: any) => b[1] - a[1])
    .map(([name, value], index) => ({
      name,
      value,
      color: `hsl(var(--chart-${(index % 5) + 1}))`,
    }));

  if (isLoading || chartsLoading || !recharts) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-[400px] w-full" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  const { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } = recharts;

  return (
    <div className="space-y-6">
      {/* Top Features by Usage */}
      <Card className="bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20">
        <CardHeader>
          <CardTitle>Top Features (Last 7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topFeatures.map((feature, index) => (
              <div key={feature.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{index + 1}. {feature.name}</span>
                    <span className="text-xs text-muted-foreground px-2 py-1 rounded-full bg-muted/50">
                      {feature.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span>{feature.uses} uses</span>
                    <span>{feature.uniqueUsers} users</span>
                    <span>{feature.completionRate.toFixed(0)}% completion</span>
                    <span>{feature.avgDurationSec}s avg</span>
                  </div>
                </div>
                <div className="flex items-center">
                  {feature.completionRate > 70 ? (
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  ) : feature.completionRate > 40 ? (
                    <Minus className="w-4 h-4 text-yellow-500" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-500" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Feature Usage by Category */}
      <Card className="bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20">
        <CardHeader>
          <CardTitle>Usage by Feature Category</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryChartData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="hsl(var(--primary))">
                {categoryChartData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Feature Discovery Funnel */}
      <Card className="bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20">
        <CardHeader>
          <CardTitle>Feature Discovery Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-muted/20 border border-border/10">
              <div className="text-sm text-muted-foreground">Features Used</div>
              <div className="text-2xl font-bold mt-1">{Object.keys(featureStats || {}).length}</div>
            </div>
            <div className="p-4 rounded-lg bg-muted/20 border border-border/10">
              <div className="text-sm text-muted-foreground">Avg Completion Rate</div>
              <div className="text-2xl font-bold mt-1">
                {(topFeatures.reduce((sum, f) => sum + f.completionRate, 0) / (topFeatures.length || 1)).toFixed(0)}%
              </div>
            </div>
            <div className="p-4 rounded-lg bg-muted/20 border border-border/10">
              <div className="text-sm text-muted-foreground">Total Interactions</div>
              <div className="text-2xl font-bold mt-1">{featureUsage?.length || 0}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
