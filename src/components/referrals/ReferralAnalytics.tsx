import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  Users, 
  Briefcase, 
  DollarSign,
  Target,
  Award
} from 'lucide-react';
import { formatCurrency } from '@/lib/format';

interface ReferralCandidate {
  id: string;
  created_at: string;
}

interface Application {
  id: string;
  status: string;
  candidate_id: string | null;
}

interface Earning {
  earned_amount: number;
}

interface Payout {
  status: string;
  payout_amount: number;
}

export function ReferralAnalytics() {
  const { user } = useAuth();

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['referral-analytics', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Fetch referral candidates
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: candidatesData } = await (supabase as any)
        .from('candidate_profiles')
        .select('id, created_at')
        .eq('referred_by_user_id', user.id);
      
      const referredCandidates: ReferralCandidate[] = candidatesData || [];
      const candidateIds = referredCandidates.map(c => c.id);

      // Fetch applications for referred candidates
      let applications: Application[] = [];
      if (candidateIds.length > 0) {
        const { data: appsData } = await supabase
          .from('applications')
          .select('id, status, candidate_id')
          .in('candidate_id', candidateIds);
        applications = (appsData as Application[]) || [];
      }

      // Fetch earnings
      const { data: earningsData } = await supabase
        .from('referral_earnings')
        .select('earned_amount')
        .eq('referrer_id', user.id);
      const earnings: Earning[] = (earningsData as Earning[]) || [];

      // Fetch payouts
      const { data: payoutsData } = await supabase
        .from('referral_payouts')
        .select('status, payout_amount')
        .eq('referrer_user_id', user.id);
      const payouts: Payout[] = (payoutsData as Payout[]) || [];

      // Calculate funnel
      const totalReferred = referredCandidates.length;
      const withApplications = new Set(applications.map(a => a.candidate_id)).size;
      const interviewed = applications.filter(a => 
        ['interview', 'final_interview', 'offer', 'hired'].includes(a.status)
      ).length;
      const hired = applications.filter(a => a.status === 'hired').length;

      // Calculate earnings
      const projectedEarnings = earnings.reduce((sum, e) => sum + (Number(e.earned_amount) || 0), 0);
      const realizedEarnings = payouts
        .filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + (Number(p.payout_amount) || 0), 0);
      const pendingEarnings = payouts
        .filter(p => p.status === 'pending')
        .reduce((sum, p) => sum + (Number(p.payout_amount) || 0), 0);

      // Monthly trend (last 6 months)
      const monthlyData: { month: string; referrals: number; hires: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthStr = date.toLocaleString('default', { month: 'short' });
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

        const monthReferrals = referredCandidates.filter(c => {
          const created = new Date(c.created_at);
          return created >= monthStart && created <= monthEnd;
        }).length;

        monthlyData.push({
          month: monthStr,
          referrals: monthReferrals,
          hires: 0, // Would need applications with hired date
        });
      }

      return {
        funnel: {
          referred: totalReferred,
          applied: withApplications,
          interviewed,
          hired,
        },
        earnings: {
          projected: projectedEarnings,
          realized: realizedEarnings,
          pending: pendingEarnings,
        },
        conversionRate: totalReferred > 0 ? (hired / totalReferred) * 100 : 0,
        monthlyTrend: monthlyData,
      };
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  const funnelSteps = [
    { label: 'Referred', value: analytics.funnel.referred, icon: <Users className="h-4 w-4" /> },
    { label: 'Applied', value: analytics.funnel.applied, icon: <Briefcase className="h-4 w-4" /> },
    { label: 'Interviewed', value: analytics.funnel.interviewed, icon: <Target className="h-4 w-4" /> },
    { label: 'Hired', value: analytics.funnel.hired, icon: <Award className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Conversion Funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Referral Conversion Funnel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            {funnelSteps.map((step, index) => {
              const prevValue = index > 0 ? funnelSteps[index - 1].value : step.value;
              const conversionRate = prevValue > 0 ? (step.value / prevValue) * 100 : 0;
              const width = analytics.funnel.referred > 0 
                ? (step.value / analytics.funnel.referred) * 100 
                : 0;

              return (
                <div key={step.label} className="flex-1 text-center">
                  <div 
                    className="h-20 rounded-lg bg-primary/10 flex items-center justify-center mb-2 transition-all"
                    style={{ opacity: 0.3 + (width / 100) * 0.7 }}
                  >
                    <div className="text-center">
                      <div className="text-2xl font-bold">{step.value}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                    {step.icon}
                    <span>{step.label}</span>
                  </div>
                  {index > 0 && (
                    <Badge variant="outline" className="text-xs mt-1">
                      {conversionRate.toFixed(0)}%
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-4 text-center">
            <Badge variant="secondary" className="text-sm">
              Overall Conversion: {analytics.conversionRate.toFixed(1)}%
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Earnings Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-500/10">
                <DollarSign className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Realized Earnings</p>
                <p className="text-2xl font-bold text-green-500">
                  {formatCurrency(analytics.earnings.realized)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-yellow-500/10">
                <DollarSign className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Payout</p>
                <p className="text-2xl font-bold text-yellow-500">
                  {formatCurrency(analytics.earnings.pending)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-500/10">
                <DollarSign className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Projected Total</p>
                <p className="text-2xl font-bold text-blue-500">
                  {formatCurrency(analytics.earnings.projected)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monthly Referral Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 h-32">
            {analytics.monthlyTrend.map((month, index) => {
              const maxReferrals = Math.max(...analytics.monthlyTrend.map(m => m.referrals), 1);
              const height = (month.referrals / maxReferrals) * 100;

              return (
                <div key={month.month} className="flex-1 flex flex-col items-center gap-2">
                  <div 
                    className="w-full bg-primary/20 rounded-t transition-all hover:bg-primary/30"
                    style={{ height: `${Math.max(height, 5)}%` }}
                  >
                    {month.referrals > 0 && (
                      <div className="text-xs text-center pt-1 font-medium">
                        {month.referrals}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">{month.month}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
