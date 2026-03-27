import { useTranslation } from 'react-i18next';
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowRight, FileWarning } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatCurrency } from "@/lib/currency";
import { differenceInDays } from "date-fns";

/**
 * Warns when placement fees older than 14 days have no linked invoice.
 * Surfaces a material receivables gap for finance review.
 */
export function UninvoicedFeesAlert() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['uninvoiced-fees-alert'],
    queryFn: async () => {
      const { data: fees, error } = await supabase
        .from('placement_fees')
        .select('id, fee_amount, hired_date, created_at, status, invoice_id')
        .is('invoice_id', null)
        .in('status', ['pending', 'approved']);

      if (error) throw error;

      const now = new Date();
      const overdueFees = (fees || []).filter(fee => {
        const refDate = fee.hired_date || fee.created_at;
        if (!refDate) return false;
        return differenceInDays(now, new Date(refDate)) > 14;
      });

      const totalAmount = overdueFees.reduce((sum, f) => sum + (f.fee_amount || 0), 0);
      const oldestDays = overdueFees.reduce((max, f) => {
        const refDate = f.hired_date || f.created_at;
        if (!refDate) return max;
        return Math.max(max, differenceInDays(now, new Date(refDate)));
      }, 0);

      return {
        count: overdueFees.length,
        totalAmount,
        oldestDays,
      };
    },
    staleTime: 60 * 1000,
  });

  if (isLoading || !data || data.count === 0) return null;

  return (
    <Alert variant="destructive" className="mb-6 border-destructive/50 bg-destructive/10">
      <FileWarning className="h-4 w-4 text-destructive" />
      <AlertTitle className="text-destructive">{t("uninvoiced_placement_fees", "Uninvoiced Placement Fees")}</AlertTitle>
      <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-2">
        <div>
          <span className="font-semibold">{data.count}</span> placement fee{data.count !== 1 ? 's' : ''} totaling{' '}
          <span className="font-semibold">{formatCurrency(data.totalAmount)}</span>{' '}
          {data.count === 1 ? 'has' : 'have'} no linked invoice.
          Oldest: <span className="font-semibold">{data.oldestDays} days</span> since hire.
          Create invoices to track receivables accurately.
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/admin/finance?tab=dashboard')}
          className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground shrink-0"
        >
          <AlertTriangle className="h-4 w-4 mr-2" />
          Review Fees
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </AlertDescription>
    </Alert>
  );
}
