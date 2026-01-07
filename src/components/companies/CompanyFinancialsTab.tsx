import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Clock, CheckCircle, AlertTriangle, DollarSign, Receipt, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface CompanyFinancialsTabProps {
  companyId: string;
  companyName?: string;
}

interface CompanyFinancials {
  total_revenue: number | null;
  total_paid: number | null;
  total_outstanding: number | null;
  invoice_count: number | null;
  payment_reliability_score: number | null;
  last_payment_date: string | null;
  default_payment_terms_days: number | null;
  bank_iban: string | null;
}

export function CompanyFinancialsTab({ companyId, companyName }: CompanyFinancialsTabProps) {
  const { data: financials, isLoading } = useQuery({
    queryKey: ['company-financials', companyId],
    queryFn: async (): Promise<CompanyFinancials | null> => {
      const { data, error } = await supabase
        .from('companies')
        .select('total_revenue, total_paid, total_outstanding, invoice_count, payment_reliability_score, last_payment_date, default_payment_terms_days, bank_iban')
        .eq('id', companyId)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '€0';
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-muted-foreground';
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreBadge = (score: number | null) => {
    if (score === null) return { label: 'No data', variant: 'secondary' as const };
    if (score >= 80) return { label: 'Excellent', variant: 'default' as const };
    if (score >= 60) return { label: 'Good', variant: 'secondary' as const };
    if (score >= 40) return { label: 'Fair', variant: 'outline' as const };
    return { label: 'Poor', variant: 'destructive' as const };
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const collectionRate = financials?.total_revenue 
    ? ((financials.total_paid || 0) / financials.total_revenue) * 100 
    : 0;

  const scoreBadge = getScoreBadge(financials?.payment_reliability_score ?? null);

  return (
    <div className="space-y-6">
      {/* Revenue Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <DollarSign className="h-4 w-4" />
              <span className="text-sm">Total Revenue</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(financials?.total_revenue ?? null)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {financials?.invoice_count || 0} invoices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">Collected</span>
            </div>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(financials?.total_paid ?? null)}
            </p>
            <div className="mt-2">
              <Progress value={collectionRate} className="h-1.5" />
              <p className="text-xs text-muted-foreground mt-1">
                {collectionRate.toFixed(0)}% collection rate
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Receipt className="h-4 w-4" />
              <span className="text-sm">Outstanding</span>
            </div>
            <p className={`text-2xl font-bold ${(financials?.total_outstanding || 0) > 0 ? 'text-amber-600 dark:text-amber-400' : ''}`}>
              {formatCurrency(financials?.total_outstanding ?? null)}
            </p>
            {financials?.last_payment_date && (
              <p className="text-xs text-muted-foreground mt-1">
                Last payment: {new Date(financials.last_payment_date).toLocaleDateString()}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payment Health */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Payment Health
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Payment Reliability Score */}
            <div className="text-center">
              <div className={`text-4xl font-bold ${getScoreColor(financials?.payment_reliability_score ?? null)}`}>
                {financials?.payment_reliability_score !== null 
                  ? financials?.payment_reliability_score 
                  : '—'}
              </div>
              <p className="text-sm text-muted-foreground mt-1">Payment Score</p>
              <Badge variant={scoreBadge.variant} className="mt-2">
                {scoreBadge.label}
              </Badge>
            </div>

            {/* Payment Terms */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <span className="text-2xl font-bold">
                  {financials?.default_payment_terms_days || 30}
                </span>
                <span className="text-muted-foreground">days</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Payment Terms</p>
            </div>

            {/* Bank Details Status */}
            <div className="text-center">
              {financials?.bank_iban ? (
                <>
                  <div className="flex items-center justify-center">
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">Bank details configured</p>
                  <p className="text-xs font-mono text-muted-foreground mt-1">
                    {financials.bank_iban.slice(0, 4)}...{financials.bank_iban.slice(-4)}
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-center">
                    <AlertTriangle className="h-8 w-8 text-amber-500" />
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">No bank details</p>
                  <p className="text-xs text-muted-foreground mt-1">Add in fee config</p>
                </>
              )}
            </div>
          </div>

          {/* Info note */}
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground">
              Payment metrics are calculated from Moneybird invoice data. Sync financial data to update scores.
              When ING/Revolut banking integrations are connected, scores will update in real-time from actual payment dates.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}