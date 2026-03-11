import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DollarSign, TrendingUp, Gift, Percent, Wallet, Calendar } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import {
  calculateUserShareEarnings,
  aggregateEmployeeEarnings,
  type RevenueShareConfig,
  type InvoiceForShare,
} from '@/lib/employeeEarnings';
import useRecharts from '@/hooks/useRecharts';

interface EmployeeEarningsTabProps {
  employeeId: string;
  userId: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);
}

export function EmployeeEarningsTab({ employeeId, userId }: EmployeeEarningsTabProps) {
  const { recharts, isLoading: rechartsLoading } = useRecharts();

  const { data, isLoading } = useQuery({
    queryKey: ['employee-earnings-tab', employeeId, userId],
    queryFn: async () => {
      const currentYear = new Date().getFullYear();

      const [commissionsRes, payoutsRes, sharesRes, invoicesRes] = await Promise.all([
        supabase
          .from('employee_commissions')
          .select('id, gross_amount, net_amount, status, commission_rate, candidate_name, company_name, job_title, period_date, created_at')
          .eq('employee_id', employeeId)
          .order('created_at', { ascending: false }),
        supabase
          .from('referral_payouts')
          .select('id, payout_amount, status, created_at, paid_at')
          .eq('referrer_user_id', userId),
        supabase
          .from('referral_revenue_shares')
          .select('*')
          .eq('user_id', userId)
          .eq('is_active', true),
        supabase
          .from('moneybird_sales_invoices')
          .select('id, total_amount, net_amount, state_normalized, invoice_date, contact_name, contact_id')
          .gte('invoice_date', `${currentYear}-01-01`)
          .order('invoice_date', { ascending: false }),
      ]);

      const commissions = commissionsRes.data || [];
      const payouts = payoutsRes.data || [];
      const shares = (sharesRes.data || []) as RevenueShareConfig[];
      const invoices = (invoicesRes.data || []) as InvoiceForShare[];

      const shareEarnings = calculateUserShareEarnings(shares, invoices);
      const aggregated = aggregateEmployeeEarnings(commissions, payouts, shareEarnings);

      // Monthly breakdown for chart (commissions only — most granular)
      const monthlyMap = new Map<string, number>();
      for (const c of commissions) {
        const date = c.period_date || c.created_at;
        if (!date) continue;
        const monthKey = date.substring(0, 7); // "YYYY-MM"
        monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + (Number(c.gross_amount) || 0));
      }

      const monthlyData = Array.from(monthlyMap.entries())
        .map(([month, amount]) => ({ month, amount }))
        .sort((a, b) => a.month.localeCompare(b.month))
        .slice(-12);

      return {
        aggregated,
        commissions,
        payouts,
        shares,
        shareEarnings,
        monthlyData,
        hasShares: shares.length > 0,
      };
    },
    enabled: !!employeeId && !!userId,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!data) return null;

  const { aggregated, commissions, payouts, monthlyData, hasShares } = data;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Wallet className="w-3.5 h-3.5" />
              Total Earnings
            </div>
            <div className="text-2xl font-bold">{formatCurrency(aggregated.totalEarnings)}</div>
            <div className="flex gap-2 mt-1 text-xs">
              <span className="text-green-500">Paid: {formatCurrency(aggregated.totalPaid)}</span>
              <span className="text-yellow-500">Pending: {formatCurrency(aggregated.totalPending)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <DollarSign className="w-3.5 h-3.5" />
              Commissions
            </div>
            <div className="text-2xl font-bold">{formatCurrency(aggregated.commissions.total)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {commissions.length} commission{commissions.length !== 1 ? 's' : ''}
            </div>
          </CardContent>
        </Card>

        {hasShares && (
          <Card className="bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <Percent className="w-3.5 h-3.5" />
                Revenue Shares
              </div>
              <div className="text-2xl font-bold">{formatCurrency(aggregated.shareEarnings.projected)}</div>
              <div className="text-xs text-green-500 mt-1">
                Realized: {formatCurrency(aggregated.shareEarnings.realized)}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Gift className="w-3.5 h-3.5" />
              Referral Payouts
            </div>
            <div className="text-2xl font-bold">{formatCurrency(aggregated.referralPayouts.total)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {payouts.length} payout{payouts.length !== 1 ? 's' : ''}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Earnings Chart */}
      {monthlyData.length > 0 && recharts && !rechartsLoading && (
        <Card className="bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Monthly Earnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <recharts.ResponsiveContainer width="100%" height={200}>
              <recharts.BarChart data={monthlyData}>
                <recharts.XAxis
                  dataKey="month"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: string) => {
                    const [, m] = v.split('-');
                    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                    return months[parseInt(m, 10) - 1] || v;
                  }}
                />
                <recharts.YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `€${(v / 1000).toFixed(0)}k`} />
                <recharts.Tooltip formatter={(value: number) => [formatCurrency(value), 'Earnings']} />
                <recharts.Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </recharts.BarChart>
            </recharts.ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Commission History */}
      <Card className="bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20">
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Commission History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[300px]">
            <div className="p-4 space-y-2">
              {commissions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">No commissions recorded</div>
              ) : (
                commissions.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/10 hover:bg-muted/20 transition-colors">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {c.candidate_name || 'Unknown Candidate'} — {c.company_name || 'Unknown Company'}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        {c.job_title && <span>{c.job_title}</span>}
                        {c.period_date && (
                          <>
                            <Calendar className="w-3 h-3" />
                            <span>{format(new Date(c.period_date), 'MMM yyyy')}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <div className="text-sm font-bold">{formatCurrency(Number(c.gross_amount) || 0)}</div>
                      <Badge
                        variant={c.status === 'paid' ? 'default' : c.status === 'approved' ? 'secondary' : 'outline'}
                        className="text-xs"
                      >
                        {c.status}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Referral Payouts History */}
      {payouts.length > 0 && (
        <Card className="bg-card/30 backdrop-blur-[var(--blur-glass)] border-border/20">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Gift className="w-4 h-4" />
              Referral Payouts
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[200px]">
              <div className="p-4 space-y-2">
                {payouts.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/10">
                    <div className="text-sm text-muted-foreground">
                      {p.created_at ? formatDistanceToNow(new Date(p.created_at), { addSuffix: true }) : 'Unknown date'}
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold">{formatCurrency(Number(p.payout_amount) || 0)}</div>
                      <Badge variant={p.status === 'paid' ? 'default' : 'outline'} className="text-xs">
                        {p.status || 'pending'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
