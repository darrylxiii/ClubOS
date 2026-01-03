import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Euro, TrendingUp, Users, Percent } from "lucide-react";
import { formatCurrency } from "@/lib/revenueCalculations";

interface RevenueShareSummaryProps {
  revenueShares: Array<{
    id: string;
    user_id: string;
    share_type: string;
    share_percentage: number | null;
    share_fixed_amount: number | null;
    applies_to: string;
    is_active: boolean;
    user_profile?: {
      full_name: string | null;
      email: string | null;
    } | null;
  }>;
}

export function RevenueShareSummary({ revenueShares }: RevenueShareSummaryProps) {
  // Fetch Moneybird revenue data
  const { data: moneybirdData, isLoading } = useQuery({
    queryKey: ['revenue-share-moneybird-summary'],
    queryFn: async () => {
      const currentYear = new Date().getFullYear();
      const startOfYear = `${currentYear}-01-01`;
      
      const { data: invoices, error } = await supabase
        .from('moneybird_sales_invoices')
        .select('total_amount, paid_at, state_normalized')
        .gte('invoice_date', startOfYear);

      if (error) throw error;

      const totalRevenue = invoices?.reduce((sum, inv) => 
        sum + (Number(inv.total_amount) || 0), 0) || 0;
      
      const paidRevenue = invoices?.filter(inv => inv.state_normalized === 'paid')
        .reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0) || 0;

      const invoiceCount = invoices?.length || 0;
      const paidCount = invoices?.filter(inv => inv.state_normalized === 'paid').length || 0;

      return {
        totalRevenue,
        paidRevenue,
        invoiceCount,
        paidCount,
      };
    },
  });

  // Calculate projected share obligations
  const activeShares = revenueShares.filter(s => s.is_active);
  
  const calculateProjectedObligations = () => {
    if (!moneybirdData) return 0;
    
    return activeShares.reduce((total, share) => {
      if (share.share_type === 'fixed_percentage' && share.share_percentage) {
        // Apply percentage to total revenue
        return total + (moneybirdData.totalRevenue * (share.share_percentage / 100));
      } else if (share.share_type === 'per_placement' && share.share_fixed_amount) {
        // Fixed amount per invoice (approximation)
        return total + (share.share_fixed_amount * moneybirdData.invoiceCount);
      }
      return total;
    }, 0);
  };

  const projectedObligations = calculateProjectedObligations();
  const netRevenue = (moneybirdData?.totalRevenue || 0) - projectedObligations;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map(i => (
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Euro className="h-4 w-4" />
            YTD Revenue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">
            {formatCurrency(moneybirdData?.totalRevenue || 0)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {moneybirdData?.invoiceCount || 0} invoices
          </p>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Collected Revenue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-success">
            {formatCurrency(moneybirdData?.paidRevenue || 0)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {moneybirdData?.paidCount || 0} paid
          </p>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Users className="h-4 w-4" />
            Share Obligations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-warning">
            {formatCurrency(projectedObligations)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {activeShares.length} active shares
          </p>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Percent className="h-4 w-4" />
            Net Revenue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className={`text-2xl font-bold ${netRevenue >= 0 ? 'text-success' : 'text-destructive'}`}>
            {formatCurrency(netRevenue)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            After share obligations
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
