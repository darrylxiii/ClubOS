import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { grossToNet } from '@/lib/vatRates';
import { formatCurrency } from '@/lib/currency';
import { CheckCircle2, AlertTriangle, MinusCircle } from 'lucide-react';

interface ClientHealth {
  name: string;
  contactId: string;
  revenue: number;
  invoiceCount: number;
  avgDaysBetween: number;
  lastInvoiceDate: string;
  status: 'healthy' | 'warning' | 'at_risk';
}

export function ClientHealthMatrix({ year, legalEntity }: { year?: number; legalEntity?: string }) {
  const currentYear = year || new Date().getFullYear();

  const { data, isLoading } = useQuery({
    queryKey: ['client-health-matrix', currentYear, legalEntity],
    queryFn: async () => {
      let q = supabase
        .from('moneybird_sales_invoices')
        .select('contact_id, contact_name, total_amount, net_amount, invoice_date')
        .gte('invoice_date', `${currentYear}-01-01`)
        .lt('invoice_date', `${currentYear + 1}-01-01`)
        .order('invoice_date', { ascending: true });

      if (legalEntity && legalEntity !== 'all') q = q.eq('legal_entity', legalEntity);

      const { data: invoices } = await q;
      if (!invoices || invoices.length === 0) return [];

      const clientMap = new Map<string, {
        name: string;
        revenue: number;
        dates: string[];
        invoiceCount: number;
      }>();

      for (const inv of invoices) {
        const cid = (inv as any).contact_id || 'unknown';
        const name = (inv as any).contact_name || 'Unknown';
        const net = Number(inv.net_amount) || grossToNet(Number(inv.total_amount) || 0, legalEntity);
        const existing = clientMap.get(cid);
        if (existing) {
          existing.revenue += net;
          existing.dates.push(inv.invoice_date);
          existing.invoiceCount++;
        } else {
          clientMap.set(cid, { name, revenue: net, dates: [inv.invoice_date], invoiceCount: 1 });
        }
      }

      const clients: ClientHealth[] = Array.from(clientMap.entries()).map(([contactId, c]) => {
        // Calculate avg days between invoices
        let avgDaysBetween = 0;
        if (c.dates.length > 1) {
          const sorted = c.dates.sort();
          let totalDays = 0;
          for (let i = 1; i < sorted.length; i++) {
            totalDays += (new Date(sorted[i]).getTime() - new Date(sorted[i - 1]).getTime()) / 86400000;
          }
          avgDaysBetween = totalDays / (sorted.length - 1);
        }

        const lastDate = c.dates[c.dates.length - 1];
        const daysSinceLast = (Date.now() - new Date(lastDate).getTime()) / 86400000;

        // Health scoring
        let status: 'healthy' | 'warning' | 'at_risk' = 'healthy';
        if (daysSinceLast > 120 || c.invoiceCount === 1) status = 'at_risk';
        else if (daysSinceLast > 60) status = 'warning';

        return {
          name: c.name,
          contactId,
          revenue: c.revenue,
          invoiceCount: c.invoiceCount,
          avgDaysBetween: Math.round(avgDaysBetween),
          lastInvoiceDate: lastDate,
          status,
        };
      }).sort((a, b) => b.revenue - a.revenue);

      return clients;
    },
    staleTime: 5 * 60 * 1000,
  });

  const statusIcon = {
    healthy: <CheckCircle2 className="h-4 w-4 text-success" />,
    warning: <AlertTriangle className="h-4 w-4 text-warning" />,
    at_risk: <MinusCircle className="h-4 w-4 text-destructive" />,
  };

  const statusLabel = {
    healthy: 'Healthy',
    warning: 'Monitor',
    at_risk: 'At Risk',
  };

  const counts = data ? {
    healthy: data.filter((c) => c.status === 'healthy').length,
    warning: data.filter((c) => c.status === 'warning').length,
    at_risk: data.filter((c) => c.status === 'at_risk').length,
  } : { healthy: 0, warning: 0, at_risk: 0 };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Client Health Matrix
          {data && data.length > 0 && (
            <div className="flex gap-2">
              <Badge variant="default" className="text-xs">{counts.healthy} Healthy</Badge>
              {counts.warning > 0 && <Badge variant="secondary" className="text-xs">{counts.warning} Monitor</Badge>}
              {counts.at_risk > 0 && <Badge variant="destructive" className="text-xs">{counts.at_risk} At Risk</Badge>}
            </div>
          )}
        </CardTitle>
        <CardDescription>Invoice frequency, payment patterns, and engagement health — {currentYear}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No client data for {currentYear}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="text-left py-2 pr-2">Client</th>
                  <th className="text-right py-2 px-2">Revenue</th>
                  <th className="text-right py-2 px-2">Invoices</th>
                  <th className="text-right py-2 px-2">Avg Interval</th>
                  <th className="text-right py-2 px-2">Last Invoice</th>
                  <th className="text-center py-2 pl-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.slice(0, 15).map((client) => (
                  <tr key={client.contactId} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                    <td className="py-2 pr-2 max-w-[180px] truncate font-medium">{client.name}</td>
                    <td className="text-right py-2 px-2 tabular-nums">{formatCurrency(client.revenue, 'EUR')}</td>
                    <td className="text-right py-2 px-2 tabular-nums">{client.invoiceCount}</td>
                    <td className="text-right py-2 px-2 tabular-nums">
                      {client.avgDaysBetween > 0 ? `${client.avgDaysBetween}d` : '—'}
                    </td>
                    <td className="text-right py-2 px-2 tabular-nums text-muted-foreground">
                      {new Date(client.lastInvoiceDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </td>
                    <td className="text-center py-2 pl-2">
                      <div className="flex items-center justify-center gap-1">
                        {statusIcon[client.status]}
                        <span className="text-xs">{statusLabel[client.status]}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
