import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, FileText, AlertCircle, CheckCircle } from "lucide-react";
import { MoneybirdFinancialMetrics } from "@/hooks/useMoneybirdFinancials";
import { formatDistanceToNow } from "date-fns";

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

  const collectionRate = metrics && metrics.total_revenue > 0
    ? ((metrics.total_paid / metrics.total_revenue) * 100).toFixed(1)
    : '0';

  const cards = [
    {
      title: 'YTD Revenue',
      value: formatCurrency(metrics?.total_revenue || 0),
      description: `${metrics?.invoice_count_paid || 0} paid invoices`,
      icon: DollarSign,
      iconColor: 'text-green-500',
    },
    {
      title: 'Total Collected',
      value: formatCurrency(metrics?.total_paid || 0),
      description: `${collectionRate}% collection rate`,
      icon: CheckCircle,
      iconColor: 'text-blue-500',
    },
    {
      title: 'Outstanding',
      value: formatCurrency(metrics?.total_outstanding || 0),
      description: `${metrics?.invoice_count_open || 0} open invoices`,
      icon: FileText,
      iconColor: 'text-amber-500',
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
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className={`h-4 w-4 ${card.iconColor}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
