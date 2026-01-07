import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Receipt, TrendingUp, Clock, AlertTriangle } from "lucide-react";
import { useVATSummary } from "@/hooks/useVATData";

interface VATLiabilityCardProps {
  year?: number;
}

export function VATLiabilityCard({ year }: VATLiabilityCardProps) {
  const { data, isLoading } = useVATSummary(year);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);
  const nextFilingDeadline = new Date(
    new Date().getFullYear(),
    currentQuarter * 3 + 1, // Month after quarter end
    0 // Last day of that month
  );

  const items = [
    {
      label: 'Net Revenue',
      value: formatCurrency(data?.netRevenue || 0),
      description: 'Excl. 21% BTW',
      icon: TrendingUp,
      color: 'text-green-500',
    },
    {
      label: 'VAT Collected',
      value: formatCurrency(data?.vatCollectedPaid || 0),
      description: 'From paid invoices',
      icon: Receipt,
      color: 'text-blue-500',
    },
    {
      label: 'VAT Outstanding',
      value: formatCurrency(data?.vatCollectedOutstanding || 0),
      description: 'From unpaid invoices',
      icon: Clock,
      color: 'text-amber-500',
    },
    {
      label: 'Total VAT Liability',
      value: formatCurrency(data?.vatCollected || 0),
      description: 'Owed to Belastingdienst',
      icon: AlertTriangle,
      color: 'text-destructive',
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              VAT Position (21% BTW)
            </CardTitle>
            <CardDescription>
              Dutch VAT liability from {data?.invoiceCount || 0} invoices
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs">
            Next filing: Q{currentQuarter} ({nextFilingDeadline.toLocaleDateString('nl-NL', { month: 'short', day: 'numeric' })})
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {items.map((item) => (
            <div key={item.label} className="space-y-1">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <item.icon className={`h-3.5 w-3.5 ${item.color}`} />
                {item.label}
              </div>
              <div className="text-xl font-bold">{item.value}</div>
              <div className="text-xs text-muted-foreground">{item.description}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
