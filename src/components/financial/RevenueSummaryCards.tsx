import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, FileText, AlertCircle, CheckCircle } from "lucide-react";
import { MoneybirdFinancialMetrics } from "@/hooks/useMoneybirdFinancials";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface RevenueSummaryCardsProps {
  metrics: MoneybirdFinancialMetrics | null;
  isLoading: boolean;
}

export function RevenueSummaryCards({ metrics, isLoading }: RevenueSummaryCardsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate net revenue (excluding 21% VAT)
  const grossRevenue = metrics?.total_revenue || 0;
  const netRevenue = Math.round(grossRevenue / 1.21 * 100) / 100;
  const vatAmount = grossRevenue - netRevenue;
  
  // Calculate net collected
  const grossCollected = metrics?.total_paid || 0;
  const netCollected = Math.round(grossCollected / 1.21 * 100) / 100;

  const collectionRate = grossRevenue > 0
    ? ((grossCollected / grossRevenue) * 100).toFixed(1)
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
      tooltip: 'Total outstanding amount (incl. VAT)',
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
