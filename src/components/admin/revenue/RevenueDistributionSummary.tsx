import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Euro, TrendingUp, Users, Briefcase, Gift, Percent } from "lucide-react";
import { formatCurrency } from "@/lib/revenueCalculations";

export function RevenueDistributionSummary() {
  const currentYear = new Date().getFullYear();
  const startOfYear = `${currentYear}-01-01`;

  // Fetch all financial data in parallel
  const { data, isLoading } = useQuery({
    queryKey: ['revenue-distribution-summary', currentYear],
    queryFn: async () => {
      // Fetch Moneybird revenue
      const { data: invoices } = await supabase
        .from('moneybird_sales_invoices')
        .select('total_amount, state_normalized')
        .gte('invoice_date', startOfYear);

      const totalRevenue = invoices?.reduce((sum, inv) => 
        sum + (Number(inv.total_amount) || 0), 0) || 0;
      const collectedRevenue = invoices?.filter(inv => inv.state_normalized === 'paid')
        .reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0) || 0;

      // Fetch employee commissions
      const { data: commissions } = await supabase
        .from('employee_commissions')
        .select('gross_amount, status')
        .gte('created_at', startOfYear);

      const totalCommissions = commissions?.reduce((sum, c) => 
        sum + (c.gross_amount || 0), 0) || 0;
      const paidCommissions = commissions?.filter(c => c.status === 'paid')
        .reduce((sum, c) => sum + (c.gross_amount || 0), 0) || 0;

      // Fetch referral payouts
      const { data: payouts } = await supabase
        .from('referral_payouts')
        .select('payout_amount, status')
        .gte('created_at', startOfYear);

      const totalPayouts = payouts?.reduce((sum, p) => 
        sum + (p.payout_amount || 0), 0) || 0;
      const paidPayouts = payouts?.filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + (p.payout_amount || 0), 0) || 0;

      // Fetch revenue shares
      const { data: shares } = await supabase
        .from('referral_revenue_shares')
        .select('share_percentage, share_fixed_amount, share_type, is_active')
        .eq('is_active', true);

      // Calculate share obligations
      const shareObligations = shares?.reduce((total, share) => {
        if (share.share_type === 'fixed_percentage' && share.share_percentage) {
          return total + (totalRevenue * (share.share_percentage / 100));
        } else if (share.share_type === 'per_placement' && share.share_fixed_amount) {
          return total + (share.share_fixed_amount * (invoices?.length || 0));
        }
        return total;
      }, 0) || 0;

      const totalObligations = totalCommissions + totalPayouts + shareObligations;
      const netRevenue = totalRevenue - totalObligations;

      return {
        totalRevenue,
        collectedRevenue,
        totalCommissions,
        paidCommissions,
        totalPayouts,
        paidPayouts,
        shareObligations,
        totalObligations,
        netRevenue,
        activeShares: shares?.length || 0,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Card key={i} className="glass-card">
            <CardContent className="pt-6">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: 'YTD Revenue',
      value: data?.totalRevenue || 0,
      icon: Euro,
      subtitle: 'From Moneybird',
      color: 'text-foreground',
    },
    {
      title: 'Collected',
      value: data?.collectedRevenue || 0,
      icon: TrendingUp,
      subtitle: 'Paid invoices',
      color: 'text-success',
    },
    {
      title: 'Recruiter Commissions',
      value: data?.totalCommissions || 0,
      icon: Briefcase,
      subtitle: `${formatCurrency(data?.paidCommissions || 0)} paid`,
      color: 'text-blue-500',
    },
    {
      title: 'Referral Payouts',
      value: data?.totalPayouts || 0,
      icon: Gift,
      subtitle: `${formatCurrency(data?.paidPayouts || 0)} paid`,
      color: 'text-purple-500',
    },
    {
      title: 'Share Obligations',
      value: data?.shareObligations || 0,
      icon: Users,
      subtitle: `${data?.activeShares || 0} active shares`,
      color: 'text-warning',
    },
    {
      title: 'Net Revenue',
      value: data?.netRevenue || 0,
      icon: Percent,
      subtitle: 'After all distributions',
      color: (data?.netRevenue || 0) >= 0 ? 'text-success' : 'text-destructive',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
      {cards.map((card, idx) => (
        <Card key={idx} className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <card.icon className="h-4 w-4" />
              {card.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-xl font-bold ${card.color}`}>
              {formatCurrency(card.value)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {card.subtitle}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
