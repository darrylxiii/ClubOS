import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowRight, Link2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

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

      return {
        unmatched: unmatchedCount || 0,
        total: totalCount || 0,
      };
    },
    staleTime: 60 * 1000,
  });

  if (isLoading || !data || data.unmatched === 0) {
    return null;
  }

  const matchRate = data.total > 0 
    ? Math.round(((data.total - data.unmatched) / data.total) * 100) 
    : 0;

  return (
    <Alert variant="destructive" className="mb-6 border-warning/50 bg-warning/10">
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
          onClick={() => navigate('/admin/reconciliation')}
          className="border-warning text-warning hover:bg-warning hover:text-warning-foreground shrink-0"
        >
          <Link2 className="h-4 w-4 mr-2" />
          Reconcile Now
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </AlertDescription>
    </Alert>
  );
}
