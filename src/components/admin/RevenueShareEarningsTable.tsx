import { useTranslation } from 'react-i18next';
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calculator, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/revenueCalculations";
import { calculateShareEarnings, type RevenueShareConfig, type InvoiceForShare } from "@/lib/employeeEarnings";

interface RevenueShare {
  id: string;
  user_id: string;
  share_type: string;
  share_percentage: number | null;
  share_fixed_amount: number | null;
  applies_to: string;
  is_active: boolean;
  effective_from?: string | null;
  effective_to?: string | null;
  min_deal_value?: number | null;
  user_profile?: {
    full_name: string | null;
    email: string | null;
  } | null;
}

interface RevenueShareEarningsTableProps {
  revenueShares: RevenueShare[];
}

export function RevenueShareEarningsTable({ revenueShares }: RevenueShareEarningsTableProps) {
  const { t } = useTranslation('common');
  const activeShares = revenueShares.filter(s => s.is_active);

  // Fetch Moneybird invoices for calculation — include net_amount
  const { data: invoiceData, isLoading } = useQuery({
    queryKey: ['revenue-share-earnings-calculation'],
    queryFn: async () => {
      const currentYear = new Date().getFullYear();
      const startOfYear = `${currentYear}-01-01`;
      
      const { data: invoices, error } = await supabase
        .from('moneybird_sales_invoices')
        .select('id, total_amount, net_amount, state_normalized, invoice_date, contact_name, contact_id')
        .gte('invoice_date', startOfYear)
        .order('invoice_date', { ascending: false });

      if (error) throw error;
      return (invoices || []) as InvoiceForShare[];
    },
    enabled: activeShares.length > 0,
  });

  if (activeShares.length === 0) {
    return null;
  }

  const getEarnings = (share: RevenueShare) => {
    if (!invoiceData) return { projected: 0, realized: 0, pending: 0 };
    const shareConfig: RevenueShareConfig = {
      id: share.id,
      user_id: share.user_id,
      share_type: share.share_type,
      share_percentage: share.share_percentage,
      share_fixed_amount: share.share_fixed_amount,
      applies_to: share.applies_to,
      is_active: share.is_active,
      effective_from: share.effective_from || null,
      effective_to: share.effective_to || null,
      min_deal_value: share.min_deal_value || null,
    };
    return calculateShareEarnings(shareConfig, invoiceData);
  };

  const getScopeLabel = (appliesTo: string) => {
    switch (appliesTo) {
      case 'all_revenue': return 'All Revenue';
      case 'all': return 'All Revenue';
      case 'specific_clients': return 'Specific Clients';
      case 'new_clients': return 'New Clients';
      default: return appliesTo;
    }
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
          Calculated from {invoiceData?.length || 0} Moneybird invoices this year (net amounts, excl. VAT)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("user", "User")}</TableHead>
              <TableHead>{t("share_type", "Share Type")}</TableHead>
              <TableHead>{t("rate", "Rate")}</TableHead>
              <TableHead>{t("scope", "Scope")}</TableHead>
              <TableHead className="text-right">{t("projected", "Projected")}</TableHead>
              <TableHead className="text-right">{t("realized", "Realized")}</TableHead>
              <TableHead className="text-right">{t("pending", "Pending")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activeShares.map((share) => {
              const earnings = getEarnings(share);

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
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {getScopeLabel(share.applies_to)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(earnings.projected)}
                  </TableCell>
                  <TableCell className="text-right font-medium text-success">
                    {formatCurrency(earnings.realized)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={earnings.pending > 0 ? 'text-warning' : 'text-muted-foreground'}>
                      {formatCurrency(earnings.pending)}
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
                  activeShares.reduce((sum, s) => sum + getEarnings(s).projected, 0)
                )}</strong>
              </span>
              <span className="text-success">
                Realized: <strong>{formatCurrency(
                  activeShares.reduce((sum, s) => sum + getEarnings(s).realized, 0)
                )}</strong>
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
