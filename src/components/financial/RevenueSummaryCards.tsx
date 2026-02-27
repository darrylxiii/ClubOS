import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, FileText, AlertCircle, CheckCircle, RefreshCw } from "lucide-react";
import { MoneybirdFinancialMetrics } from "@/hooks/useMoneybirdFinancials";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getVATRate } from "@/lib/vatRates";

interface RevenueSummaryCardsProps {
  metrics: MoneybirdFinancialMetrics | null;
  isLoading: boolean;
  onSync?: () => void;
  isSyncing?: boolean;
  legalEntity?: string;
}

export function RevenueSummaryCards({ metrics, isLoading, onSync, isSyncing, legalEntity }: RevenueSummaryCardsProps) {
  const fmtCurrency = (amount: number) => formatCurrency(amount);

  const vatRate = getVATRate(legalEntity);
  const vatLabel = legalEntity === 'tqc_dubai' ? '5% VAT' : '21% BTW';

  // total_revenue is already NET (excl. VAT) from the edge function
  const netRevenue = metrics?.total_revenue || 0;
  const grossRevenue = (metrics as any)?.total_revenue_gross || Math.round(netRevenue * (1 + vatRate));
  const vatAmount = (metrics as any)?.vat_amount || (grossRevenue - netRevenue);
  
  // total_paid is already NET from the edge function
  const netCollected = metrics?.total_paid || 0;
  const grossCollected = Math.round(netCollected * (1 + getVATRate()));

  const collectionRate = netRevenue > 0
    ? ((netCollected / netRevenue) * 100).toFixed(1)
    : '0';

  const cards = [
    {
      title: 'Net Revenue',
      value: formatCurrency(netRevenue),
      description: `Excl. ${formatCurrency(vatAmount)} VAT`,
      icon: DollarSign,
      iconColor: 'text-green-500',
      tooltip: `Gross: ${formatCurrency(grossRevenue)} (incl. 21% BTW)`,
    },
    {
      title: 'Net Collected',
      value: formatCurrency(netCollected),
      description: `${collectionRate}% collection rate`,
      icon: CheckCircle,
      iconColor: 'text-blue-500',
      tooltip: `Gross: ${formatCurrency(grossCollected)} (incl. 21% BTW)`,
    },
    {
      title: 'Outstanding',
      value: formatCurrency(metrics?.total_outstanding || 0),
      description: `${metrics?.invoice_count_open || 0} open invoices`,
      icon: FileText,
      iconColor: 'text-amber-500',
      tooltip: 'Total outstanding net amount',
    },
    {
      title: 'Overdue',
      value: formatCurrency(
        (metrics?.payment_aging?.overdue_30 || 0) +
        (metrics?.payment_aging?.overdue_60 || 0) +
        (metrics?.payment_aging?.overdue_90 || 0) +
        (metrics?.payment_aging?.overdue_90_plus || 0)
      ),
      description: `${metrics?.invoice_count_late || 0} late invoices`,
      icon: AlertCircle,
      iconColor: 'text-red-500',
      tooltip: 'Invoices past due date',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-24 bg-muted rounded" />
              <div className="h-4 w-4 bg-muted rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-7 w-28 bg-muted rounded mb-1" />
              <div className="h-3 w-20 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Empty/error state when no metrics data exists
  if (!metrics) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className={`h-4 w-4 text-muted-foreground`} />
            </CardHeader>
            <CardContent>
              <div className="text-lg text-muted-foreground">No data synced</div>
              {onSync && (
                <Button
                  variant="link"
                  size="sm"
                  className="px-0 h-auto text-xs"
                  onClick={onSync}
                  disabled={isSyncing}
                >
                  <RefreshCw className={`h-3 w-3 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Syncing...' : 'Sync Now'}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Tooltip key={card.title}>
            <TooltipTrigger asChild>
              <Card className="cursor-help">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                  <card.icon className={`h-4 w-4 ${card.iconColor}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{card.value}</div>
                  <p className="text-xs text-muted-foreground">{card.description}</p>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>
              <p>{card.tooltip}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
