import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { grossToNet } from '@/lib/vatRates';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface RevenueConcentrationCardProps {
  year: number;
  legalEntity?: string;
}

export function RevenueConcentrationCard({ year, legalEntity }: RevenueConcentrationCardProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['revenue-concentration', year, legalEntity],
    queryFn: async () => {
      let q = supabase
        .from('moneybird_sales_invoices')
        .select('contact_id, contact_name, total_amount, net_amount')
        .gte('invoice_date', `${year}-01-01`)
        .lt('invoice_date', `${year + 1}-01-01`);
      
      if (legalEntity && legalEntity !== 'all') {
        q = q.eq('legal_entity', legalEntity);
      }

      const { data: invoices } = await q;
      if (!invoices || invoices.length === 0) return null;

      // Aggregate by client
      const clientMap = new Map<string, { name: string; revenue: number }>();
      let totalRevenue = 0;

      for (const inv of invoices) {
        const contactId = (inv as any).contact_id || 'unknown';
        const contactName = (inv as any).contact_name || 'Unknown';
        const net = Number((inv as any).net_amount) || grossToNet(Number(inv.total_amount) || 0, legalEntity);
        
        const existing = clientMap.get(contactId);
        if (existing) {
          existing.revenue += net;
        } else {
          clientMap.set(contactId, { name: contactName, revenue: net });
        }
        totalRevenue += net;
      }

      // Sort by revenue desc
      const clients = Array.from(clientMap.entries())
        .map(([id, data]) => ({ id, ...data, share: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0 }))
        .sort((a, b) => b.revenue - a.revenue);

      // HHI = sum of squared market shares (in %)
      const hhi = clients.reduce((sum, c) => sum + Math.pow(c.share, 2), 0);

      const top1Share = clients[0]?.share || 0;
      const top3Share = clients.slice(0, 3).reduce((s, c) => s + c.share, 0);
      const top5Share = clients.slice(0, 5).reduce((s, c) => s + c.share, 0);

      // Concentration risk level
      let riskLevel: 'low' | 'medium' | 'high' = 'low';
      if (top1Share > 40 || hhi > 2500) riskLevel = 'high';
      else if (top1Share > 25 || hhi > 1500) riskLevel = 'medium';

      return {
        clients: clients.slice(0, 5),
        totalRevenue,
        totalClients: clients.length,
        hhi: Math.round(hhi),
        top1Share,
        top3Share,
        top5Share,
        riskLevel,
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  const fmtEur = (v: number) => {
    if (Math.abs(v) >= 1_000_000) return `€${(v / 1_000_000).toFixed(1)}M`;
    if (Math.abs(v) >= 1_000) return `€${(v / 1_000).toFixed(1)}K`;
    return `€${v.toFixed(0)}`;
  };

  const riskColors = {
    low: 'text-success',
    medium: 'text-warning',
    high: 'text-destructive',
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Revenue Concentration
          {data && (
            <Badge
              variant={data.riskLevel === 'high' ? 'destructive' : data.riskLevel === 'medium' ? 'secondary' : 'default'}
            >
              {data.riskLevel === 'high' ? (
                <><AlertTriangle className="h-3 w-3 mr-1" />High Risk</>
              ) : data.riskLevel === 'medium' ? (
                <>Moderate</>
              ) : (
                <><CheckCircle2 className="h-3 w-3 mr-1" />Diversified</>
              )}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>Client dependency analysis — {year}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}
          </div>
        ) : !data ? (
          <p className="text-sm text-muted-foreground">No revenue data for {year}</p>
        ) : (
          <div className="space-y-4">
            {/* Concentration metrics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Top 1 Share</p>
                <p className={`text-lg font-bold ${data.top1Share > 25 ? 'text-destructive' : ''}`}>
                  {data.top1Share.toFixed(1)}%
                </p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Top 3 Share</p>
                <p className="text-lg font-bold">{data.top3Share.toFixed(1)}%</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">HHI Index</p>
                <p className={`text-lg font-bold ${data.hhi > 2500 ? 'text-destructive' : data.hhi > 1500 ? 'text-warning' : 'text-success'}`}>
                  {data.hhi.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Client breakdown */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Top Clients ({data.totalClients} total)
              </p>
              {data.clients.map((client) => (
                <div key={client.id} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="truncate max-w-[60%]">{client.name}</span>
                    <span className="font-medium">
                      {fmtEur(client.revenue)} ({client.share.toFixed(1)}%)
                    </span>
                  </div>
                  <Progress value={client.share} className="h-1.5" />
                </div>
              ))}
            </div>

            {/* Investor guidance */}
            <div className="p-3 rounded-lg border text-xs text-muted-foreground">
              <p>
                <span className="font-medium">HHI Guidelines:</span> &lt;1500 = diversified, 
                1500–2500 = moderate concentration, &gt;2500 = highly concentrated.
                {data.riskLevel === 'high' && (
                  <span className="text-destructive font-medium"> Action needed: reduce single-client dependency.</span>
                )}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
