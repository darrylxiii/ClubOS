import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { grossToNet } from '@/lib/vatRates';
import { formatCurrency } from '@/lib/currency';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { useEffect, useState } from 'react';

export function LiveARRTicker() {
  const { t } = useTranslation('common');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 120_000); // 2min refresh
    return () => clearInterval(interval);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['live-arr-ticker', tick],
    queryFn: async () => {
      const year = new Date().getFullYear();
      const month = new Date().getMonth() + 1;

      // Current year invoices
      const { data: invs } = await supabase
        .from('moneybird_sales_invoices')
        .select('total_amount, net_amount, invoice_date')
        .gte('invoice_date', `${year}-01-01`)
        .lt('invoice_date', `${year + 1}-01-01`);

      const ytdRevenue = (invs || []).reduce(
        (s, i) => s + (Number(i.net_amount) || grossToNet(Number(i.total_amount) || 0)),
        0,
      );

      // Annualize
      const annualized = month > 0 ? (ytdRevenue / month) * 12 : 0;
      const mrr = annualized / 12;

      // Previous year for growth
      const { data: prevInvs } = await supabase
        .from('moneybird_sales_invoices')
        .select('total_amount, net_amount')
        .gte('invoice_date', `${year - 1}-01-01`)
        .lt('invoice_date', `${year}-01-01`);

      const prevRevenue = (prevInvs || []).reduce(
        (s, i) => s + (Number(i.net_amount) || grossToNet(Number(i.total_amount) || 0)),
        0,
      );

      const yoyGrowth = prevRevenue > 0 ? ((ytdRevenue / (prevRevenue * (month / 12))) - 1) * 100 : 0;

      return { ytdRevenue, annualized, mrr, yoyGrowth, month };
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
    refetchIntervalInBackground: false,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
        ))}
      </div>
    );
  }

  const metrics = [
    {
      label: t('financialSection.annualizedRevenue'),
      value: formatCurrency(data?.annualized || 0, 'EUR'),
      icon: Activity,
    },
    {
      label: t('financialSection.monthlyRunRate'),
      value: formatCurrency(data?.mrr || 0, 'EUR'),
      icon: Activity,
    },
    {
      label: t('financialSection.ytdRevenue', { months: data?.month || 0 }),
      value: formatCurrency(data?.ytdRevenue || 0, 'EUR'),
      icon: TrendingUp,
    },
    {
      label: t('financialSection.yoyGrowthRate'),
      value: `${(data?.yoyGrowth || 0).toFixed(1)}%`,
      icon: (data?.yoyGrowth || 0) >= 0 ? TrendingUp : TrendingDown,
      color: (data?.yoyGrowth || 0) >= 0 ? 'text-success' : 'text-destructive',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {metrics.map((m) => (
        <Card key={m.label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <m.icon className="h-3.5 w-3.5" />
              {m.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className={`text-2xl font-bold tabular-nums ${m.color || ''}`}>{m.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
