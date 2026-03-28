import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStrategistWorkload } from '@/hooks/useStrategistWorkload';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, Target, DollarSign, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { subDays, format } from 'date-fns';
import { cn } from '@/lib/utils';

interface AttentionAlert {
  type: 'inactive' | 'target_risk' | 'pending_commissions' | 'at_capacity';
  title: string;
  description: string;
  count: number;
  members: { id: string; name: string; avatar_url: string | null; detail: string }[];
  action?: { label: string; tab?: string };
  icon: React.ElementType;
  color: string;
}

export function NeedsAttentionPanel({ onTabChange }: { onTabChange?: (tab: string) => void }) {
  const navigate = useNavigate();
  const { data: workloads } = useStrategistWorkload();

  const { data: alerts, isLoading } = useQuery({
    queryKey: ['needs-attention-alerts'],
    queryFn: async (): Promise<AttentionAlert[]> => {
      const sevenDaysAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd');
      const now = new Date();

      const [auditResult, targetsResult, commissionsResult, profilesResult] = await Promise.all([
        // Recent pipeline activity per user
        supabase
          .from('pipeline_audit_logs')
          .select('user_id')
          .gte('created_at', sevenDaysAgo),

        // Current targets with low progress
        supabase
          .from('employee_targets')
          .select('employee_id, period_type, period_start, period_end, revenue_target, revenue_achieved, placements_target, placements_achieved')
          .lte('period_start', now.toISOString())
          .gte('period_end', now.toISOString()),

        // Pending commissions
        supabase
          .from('employee_commissions')
          .select('employee_id, gross_amount')
          .eq('status', 'pending'),

        // All strategist/admin profiles
        supabase
          .from('user_roles')
          .select('user_id')
          .in('role', ['admin', 'strategist']),
      ]);

      const activeUserIds = new Set((auditResult.data || []).map(l => l.user_id));
      const teamUserIds = new Set((profilesResult.data || []).map(r => r.user_id));

      const alerts: AttentionAlert[] = [];

      // 1. Inactive members (team members with no pipeline activity in 7 days)
      if (workloads) {
        const inactiveMembers = workloads.filter(w =>
          teamUserIds.has(w.id) && !activeUserIds.has(w.id)
        );
        if (inactiveMembers.length > 0) {
          alerts.push({
            type: 'inactive',
            title: `${inactiveMembers.length} inactive team member${inactiveMembers.length > 1 ? 's' : ''}`,
            description: 'No pipeline activity in the last 7 days',
            count: inactiveMembers.length,
            members: inactiveMembers.slice(0, 4).map(m => ({
              id: m.id,
              name: m.full_name,
              avatar_url: m.avatar_url,
              detail: m.lastActiveAt ? `Last active: ${new Date(m.lastActiveAt).toLocaleDateString()}` : 'No recent activity',
            })),
            icon: Clock,
            color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
          });
        }
      }

      // 2. Targets at risk (below 50% progress in the last third of period)
      const atRiskTargets = (targetsResult.data || []).filter(t => {
        if (!t.revenue_target && !t.placements_target) return false;
        const start = new Date(t.period_start);
        const end = new Date(t.period_end);
        const totalDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
        const elapsed = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
        const progressRatio = elapsed / totalDays;

        if (progressRatio < 0.66) return false; // only alert in last third

        const revenueProgress = t.revenue_target ? (t.revenue_achieved / t.revenue_target) : 1;
        const placementProgress = t.placements_target ? (t.placements_achieved / t.placements_target) : 1;

        return revenueProgress < 0.5 || placementProgress < 0.5;
      });

      if (atRiskTargets.length > 0 && workloads) {
        const riskMembers = atRiskTargets.map(t => {
          const member = workloads.find(w => w.employeeId === t.employee_id);
          const revPct = t.revenue_target ? Math.round((t.revenue_achieved / t.revenue_target) * 100) : 100;
          return {
            id: member?.id || t.employee_id,
            name: member?.full_name || 'Unknown',
            avatar_url: member?.avatar_url || null,
            detail: `${revPct}% of revenue target`,
          };
        });

        alerts.push({
          type: 'target_risk',
          title: `${atRiskTargets.length} target${atRiskTargets.length > 1 ? 's' : ''} at risk`,
          description: 'Below 50% progress in final third of period',
          count: atRiskTargets.length,
          members: riskMembers.slice(0, 4),
          action: { label: 'View Targets', tab: 'targets-commissions' },
          icon: Target,
          color: 'text-red-500 bg-red-500/10 border-red-500/20',
        });
      }

      // 3. Pending commissions
      const pendingCommissions = commissionsResult.data || [];
      if (pendingCommissions.length > 0) {
        const totalPending = pendingCommissions.reduce((sum, c) => sum + (c.gross_amount || 0), 0);
        alerts.push({
          type: 'pending_commissions',
          title: `${pendingCommissions.length} commission${pendingCommissions.length > 1 ? 's' : ''} pending approval`,
          description: `${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(totalPending)} total`,
          count: pendingCommissions.length,
          members: [],
          action: { label: 'Review', tab: 'targets-commissions' },
          icon: DollarSign,
          color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
        });
      }

      // 4. At capacity
      if (workloads) {
        const atCapacity = workloads.filter(w => w.capacityPercent >= 90);
        if (atCapacity.length > 0) {
          alerts.push({
            type: 'at_capacity',
            title: `${atCapacity.length} strategist${atCapacity.length > 1 ? 's' : ''} at capacity`,
            description: '90%+ workload — may need redistribution',
            count: atCapacity.length,
            members: atCapacity.slice(0, 4).map(w => ({
              id: w.id,
              name: w.full_name,
              avatar_url: w.avatar_url,
              detail: `${w.capacityPercent}% capacity`,
            })),
            icon: AlertTriangle,
            color: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
          });
        }
      }

      return alerts;
    },
    staleTime: 60000,
    enabled: !!workloads,
  });

  if (isLoading || !alerts) return null;

  if (alerts.length === 0) {
    return (
      <Card className="border-emerald-500/20 bg-emerald-500/5">
        <CardContent className="flex items-center gap-3 py-4">
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">All clear — no items need attention right now</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
      {alerts.map(alert => (
        <Card
          key={alert.type}
          className={cn('border cursor-pointer hover:shadow-md transition-shadow', alert.color.split(' ').slice(1).join(' '))}
          onClick={() => {
            if (alert.action?.tab && onTabChange) {
              onTabChange(alert.action.tab);
            }
          }}
        >
          <CardContent className="py-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <alert.icon className={cn('h-4 w-4', alert.color.split(' ')[0])} />
                <span className="text-sm font-semibold">{alert.title}</span>
              </div>
              {alert.action && (
                <Badge variant="outline" className="text-[10px]">{alert.action.label}</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{alert.description}</p>

            {alert.members.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {alert.members.map(m => (
                  <button
                    key={m.id}
                    className="flex items-center gap-1.5 text-xs bg-background/50 rounded-full px-2 py-1 hover:bg-background transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/admin/employees/${m.id}`);
                    }}
                  >
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={m.avatar_url || undefined} />
                      <AvatarFallback className="text-[8px]">{m.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium truncate max-w-[80px]">{m.name.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
