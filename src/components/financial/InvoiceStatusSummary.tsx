import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { useMoneybirdInvoices } from "@/hooks/useMoneybirdInvoices";

interface InvoiceStatusSummaryProps {
  year: number;
}

export function InvoiceStatusSummary({ year }: InvoiceStatusSummaryProps) {
  const { data: invoices, isLoading } = useMoneybirdInvoices(year);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const statusCounts = invoices?.reduce((acc, inv) => {
    const state = inv.state_normalized || 'unknown';
    if (!acc[state]) {
      acc[state] = { count: 0, amount: 0 };
    }
    acc[state].count++;
    acc[state].amount += Number(inv.total_amount) || 0;
    return acc;
  }, {} as Record<string, { count: number; amount: number }>) || {};

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(amount);

  const statusConfig = [
    { key: 'draft', label: 'Draft', icon: FileText, color: 'bg-muted text-muted-foreground' },
    { key: 'open', label: 'Open', icon: Clock, color: 'bg-blue-500/10 text-blue-500' },
    { key: 'pending_payment', label: 'Pending', icon: Clock, color: 'bg-yellow-500/10 text-yellow-500' },
    { key: 'late', label: 'Overdue', icon: AlertTriangle, color: 'bg-destructive/10 text-destructive' },
    { key: 'paid', label: 'Paid', icon: CheckCircle, color: 'bg-green-500/10 text-green-500' },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Invoice Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {statusConfig.map(({ key, label, icon: Icon, color }) => {
            const data = statusCounts[key] || { count: 0, amount: 0 };
            return (
              <div key={key} className="text-center">
                <Badge variant="outline" className={`${color} mb-2 px-2 py-1`}>
                  <Icon className="h-3 w-3 mr-1" />
                  {label}
                </Badge>
                <div className="text-lg font-semibold">{data.count}</div>
                <div className="text-xs text-muted-foreground">
                  {formatCurrency(data.amount)}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
