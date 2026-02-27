import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowRight, Link2, Scale } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatCurrency } from "@/lib/currency";

interface ReconciliationAlertProps {
  year: number;
}

export function ReconciliationAlert({ year }: ReconciliationAlertProps) {
  const navigate = useNavigate();
  const startOfYear = `${year}-01-01`;
  const endOfYear = `${year}-12-31`;

  const { data, isLoading } = useQuery({
    queryKey: ['unmatched-invoices-count', year],
    queryFn: async () => {
      // Unlinked Moneybird invoices (no company_id)
      const { count: unmatchedCount } = await supabase
        .from('moneybird_sales_invoices')
        .select('*', { count: 'exact', head: true })
        .gte('invoice_date', startOfYear)
        .lte('invoice_date', endOfYear)
        .is('company_id', null);

      const { count: totalCount } = await supabase
        .from('moneybird_sales_invoices')
        .select('*', { count: 'exact', head: true })
        .gte('invoice_date', startOfYear)
        .lte('invoice_date', endOfYear);

      // Cross-reference: placement fees vs Moneybird invoices
      const { data: fees } = await supabase
        .from('placement_fees')
        .select('id, fee_amount')
        .gte('created_at', startOfYear)
        .lte('created_at', endOfYear);

      const { data: invoices } = await supabase
        .from('moneybird_sales_invoices')
        .select('id, net_amount, total_amount, company_id, placement_fee_id')
        .gte('invoice_date', startOfYear)
        .lte('invoice_date', endOfYear);

      // Fees with no matching invoice (by placement_fee_id link)
      const linkedFeeIds = new Set((invoices || []).map(i => i.placement_fee_id).filter(Boolean));
      const unmatchedFees = (fees || []).filter(f => !linkedFeeIds.has(f.id));
      const unmatchedFeeAmount = unmatchedFees.reduce((s, f) => s + (f.fee_amount || 0), 0);

      // Invoices with no matching fee
      const invoicesWithoutFee = (invoices || []).filter(i => !i.placement_fee_id);

      return {
        unmatched: unmatchedCount || 0,
        total: totalCount || 0,
        unmatchedFeeCount: unmatchedFees.length,
        unmatchedFeeAmount,
        invoicesWithoutFeeCount: invoicesWithoutFee.length,
      };
    },
    staleTime: 60 * 1000,
  });

  if (isLoading || !data) return null;

  const hasUnmatchedInvoices = data.unmatched > 0;
  const hasReconciliationGap = data.unmatchedFeeCount > 0 || data.invoicesWithoutFeeCount > 0;

  if (!hasUnmatchedInvoices && !hasReconciliationGap) return null;

  const matchRate = data.total > 0
    ? Math.round(((data.total - data.unmatched) / data.total) * 100)
    : 0;

  return (
    <div className="space-y-3 mb-6">
      {hasUnmatchedInvoices && (
        <Alert variant="destructive" className="border-warning/50 bg-warning/10">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertTitle className="text-warning">Invoice Reconciliation Required</AlertTitle>
          <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-2">
            <div>
              <span className="font-semibold">{data.unmatched}</span> of {data.total} invoices
              are not linked to companies ({matchRate}% match rate).
              Link invoices for accurate revenue attribution and client LTV tracking.
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin/finance?tab=reconciliation')}
              className="border-warning text-warning hover:bg-warning hover:text-warning-foreground shrink-0"
            >
              <Link2 className="h-4 w-4 mr-2" />
              Reconcile Now
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {hasReconciliationGap && (
        <Alert variant="destructive" className="border-orange-500/50 bg-orange-500/10">
          <Scale className="h-4 w-4 text-orange-500" />
          <AlertTitle className="text-orange-500">Fee ↔ Invoice Cross-Reference Gap</AlertTitle>
          <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-2">
            <div>
              {data.unmatchedFeeCount > 0 && (
                <span>
                  <span className="font-semibold">{data.unmatchedFeeCount}</span> placement fee{data.unmatchedFeeCount !== 1 ? 's' : ''}{' '}
                  ({formatCurrency(data.unmatchedFeeAmount)}) not linked to any Moneybird invoice.{' '}
                </span>
              )}
              {data.invoicesWithoutFeeCount > 0 && (
                <span>
                  <span className="font-semibold">{data.invoicesWithoutFeeCount}</span> Moneybird invoice{data.invoicesWithoutFeeCount !== 1 ? 's' : ''}{' '}
                  not linked to a placement fee.
                </span>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin/finance?tab=reconciliation')}
              className="border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white shrink-0"
            >
              <Scale className="h-4 w-4 mr-2" />
              Cross-Reference
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
