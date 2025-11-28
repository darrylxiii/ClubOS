import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Shield, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';

export function AdminIntelligenceTab() {
  const { data: adminActions, isLoading } = useQuery({
    queryKey: ['admin-audit-activity'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_audit_activity')
        .select('*')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000,
  });

  // Action type breakdown
  const actionBreakdown = adminActions?.reduce((acc, action) => {
    acc[action.action_type] = (acc[action.action_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Category breakdown
  const categoryBreakdown = adminActions?.reduce((acc, action) => {
    acc[action.action_category] = (acc[action.action_category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // High-impact actions
  const highImpactActions = adminActions?.filter(a => (a.impact_score || 0) >= 7);

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'approve': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'reject': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'delete': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      default: return <Shield className="w-4 h-4 text-blue-500" />;
    }
  };

  const getImpactBadge = (score: number) => {
    if (score >= 8) return <Badge variant="destructive">Critical</Badge>;
    if (score >= 6) return <Badge variant="default">High</Badge>;
    if (score >= 4) return <Badge variant="secondary">Medium</Badge>;
    return <Badge variant="outline">Low</Badge>;
  };

  if (isLoading) {
    return <div className="p-6">Loading admin intelligence...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Actions</CardTitle>
            <Shield className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminActions?.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Last 7 days</p>
          </CardContent>
        </Card>

        <Card className="bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Approvals</CardTitle>
            <CheckCircle className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{actionBreakdown?.['approve'] || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Approved actions</p>
          </CardContent>
        </Card>

        <Card className="bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Rejections</CardTitle>
            <XCircle className="w-4 h-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{actionBreakdown?.['reject'] || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Rejected items</p>
          </CardContent>
        </Card>

        <Card className="bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">High Impact</CardTitle>
            <AlertTriangle className="w-4 h-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{highImpactActions?.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Critical actions</p>
          </CardContent>
        </Card>
      </div>

      {/* Action Category Breakdown */}
      <Card className="bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20">
        <CardHeader>
          <CardTitle>Actions by Category (7d)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(categoryBreakdown || {}).map(([category, count]) => (
              <div key={category} className="flex items-center justify-between">
                <span className="text-sm font-medium capitalize">{category.replace(/_/g, ' ')}</span>
                <div className="flex items-center gap-3">
                  <div className="h-2 w-32 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all" 
                      style={{ width: `${(count / (adminActions?.length || 1)) * 100}%` }} 
                    />
                  </div>
                  <span className="text-sm text-muted-foreground w-8 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent High-Impact Actions */}
      <Card className="bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20">
        <CardHeader>
          <CardTitle>Recent High-Impact Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {highImpactActions?.map((action) => (
                <div key={action.id} className="p-4 rounded-lg bg-muted/20 border border-border/10">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {getActionIcon(action.action_type)}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium capitalize">{action.action_type}</span>
                          {getImpactBadge(action.impact_score || 0)}
                          <Badge variant="outline" className="text-xs">
                            {action.action_category.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Target: {action.target_entity}
                        </div>
                        {action.reason && (
                          <div className="text-xs text-muted-foreground mt-2">
                            Reason: {action.reason}
                          </div>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(action.created_at), 'MMM dd, HH:mm')}
                    </span>
                  </div>
                </div>
              ))}
              {(!highImpactActions || highImpactActions.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  No high-impact actions in the last 7 days
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
