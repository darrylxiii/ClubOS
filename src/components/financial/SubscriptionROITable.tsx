import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useVendorSubscriptions } from '@/hooks/useVendorSubscriptions';
import { formatCurrency } from '@/lib/revenueCalculations';

export function SubscriptionROITable() {
  const { data: subscriptions, isLoading } = useVendorSubscriptions('active');

  if (isLoading) {
    return <Card><CardContent className="pt-6"><Skeleton className="h-[300px]" /></CardContent></Card>;
  }

  if (!subscriptions || subscriptions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription ROI</CardTitle>
          <CardDescription>No active subscriptions to display.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const criticalityColor = (level: string) => {
    switch (level) {
      case 'critical': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscription ROI Overview</CardTitle>
        <CardDescription>Active subscriptions with cost justification and utilization</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendor</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">MRC</TableHead>
              <TableHead>Criticality</TableHead>
              <TableHead>Utilization</TableHead>
              <TableHead>Revenue Attribution</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subscriptions.map(sub => {
              const utilization = sub.seats_licensed && sub.seats_used
                ? Math.round((sub.seats_used / sub.seats_licensed) * 100)
                : null;

              return (
                <TableRow key={sub.id}>
                  <TableCell className="font-medium">{sub.vendor_name}</TableCell>
                  <TableCell>{sub.category}</TableCell>
                  <TableCell className="text-right">{formatCurrency(sub.monthly_cost)}</TableCell>
                  <TableCell>
                    <Badge variant={criticalityColor(sub.business_criticality)}>
                      {sub.business_criticality}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {utilization !== null ? (
                      <span className={utilization < 50 ? 'text-destructive' : utilization < 75 ? 'text-warning' : 'text-success'}>
                        {utilization}% ({sub.seats_used}/{sub.seats_licensed})
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-muted-foreground">
                    {(sub as any).revenue_attribution || '—'}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default SubscriptionROITable;
