import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calculator, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/revenueCalculations";

interface RevenueShare {
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
}

interface RevenueShareEarningsTableProps {
  revenueShares: RevenueShare[];
}

export function RevenueShareEarningsTable({ revenueShares }: RevenueShareEarningsTableProps) {
  const activeShares = revenueShares.filter(s => s.is_active);

  // Fetch Moneybird invoices for calculation
  const { data: invoiceData, isLoading } = useQuery({
    queryKey: ['revenue-share-earnings-calculation'],
    queryFn: async () => {
      const currentYear = new Date().getFullYear();
      const startOfYear = `${currentYear}-01-01`;
      
      const { data: invoices, error } = await supabase
        .from('moneybird_sales_invoices')
        .select('id, total_amount, state_normalized, invoice_date, contact_name')
        .gte('invoice_date', startOfYear)
        .order('invoice_date', { ascending: false });

      if (error) throw error;
      return invoices || [];
    },
    enabled: activeShares.length > 0,
  });

  if (activeShares.length === 0) {
    return null;
  }

  const calculateEarnings = (share: RevenueShare) => {
    if (!invoiceData) return { projected: 0, realized: 0 };

    let projected = 0;
    let realized = 0;

    invoiceData.forEach(invoice => {
      const amount = Number(invoice.total_amount) || 0;
      let shareAmount = 0;

      if (share.share_type === 'fixed_percentage' && share.share_percentage) {
        shareAmount = amount * (share.share_percentage / 100);
      } else if (share.share_type === 'per_placement' && share.share_fixed_amount) {
        shareAmount = share.share_fixed_amount;
      }

      projected += shareAmount;
      if (invoice.state_normalized === 'paid') {
        realized += shareAmount;
      }
    });

    return { projected, realized };
  };

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Earnings by Share
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          YTD Earnings by Revenue Share
        </CardTitle>
        <CardDescription>
          Calculated from {invoiceData?.length || 0} Moneybird invoices this year
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Share Type</TableHead>
              <TableHead>Rate</TableHead>
              <TableHead className="text-right">Projected</TableHead>
              <TableHead className="text-right">Realized</TableHead>
              <TableHead className="text-right">Pending</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activeShares.map((share) => {
              const earnings = calculateEarnings(share);
              const pending = earnings.projected - earnings.realized;

              return (
                <TableRow key={share.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {share.user_profile?.full_name || 'Unknown'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {share.user_profile?.email}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {share.share_type === 'fixed_percentage' ? 'Percentage' : 'Fixed'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {share.share_type === 'fixed_percentage' 
                      ? `${share.share_percentage}%`
                      : formatCurrency(share.share_fixed_amount || 0)
                    }
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(earnings.projected)}
                  </TableCell>
                  <TableCell className="text-right font-medium text-success">
                    {formatCurrency(earnings.realized)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={pending > 0 ? 'text-warning' : 'text-muted-foreground'}>
                      {formatCurrency(pending)}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {/* Total row */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex justify-between items-center">
            <span className="font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Total Obligations
            </span>
            <div className="flex gap-6 text-sm">
              <span>
                Projected: <strong>{formatCurrency(
                  activeShares.reduce((sum, s) => sum + calculateEarnings(s).projected, 0)
                )}</strong>
              </span>
              <span className="text-success">
                Realized: <strong>{formatCurrency(
                  activeShares.reduce((sum, s) => sum + calculateEarnings(s).realized, 0)
                )}</strong>
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
