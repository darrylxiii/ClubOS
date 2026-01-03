import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/revenueCalculations";
import { 
  FileText, 
  CheckCircle, 
  DollarSign, 
  UserPlus, 
  Gift,
  Clock,
  AlertCircle
} from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";

interface FinancialEvent {
  id: string;
  type: string;
  title: string;
  description: string;
  amount?: number;
  timestamp: string;
  status?: string;
}

export function FinancialEventsTimeline() {
  const { data: events, isLoading } = useQuery({
    queryKey: ['financial-events-timeline'],
    queryFn: async () => {
      const allEvents: FinancialEvent[] = [];

      // Recent paid invoices
      const { data: paidInvoices } = await supabase
        .from('moneybird_sales_invoices')
        .select('id, invoice_number, contact_name, total_amount, paid_at')
        .eq('state_normalized', 'paid')
        .not('paid_at', 'is', null)
        .order('paid_at', { ascending: false })
        .limit(5);

      paidInvoices?.forEach(inv => {
        allEvents.push({
          id: `inv-${inv.id}`,
          type: 'invoice_paid',
          title: 'Invoice Paid',
          description: `${inv.contact_name || 'Unknown'} - #${inv.invoice_number}`,
          amount: Number(inv.total_amount),
          timestamp: inv.paid_at!,
          status: 'success',
        });
      });

      // Recent placement fees
      const { data: recentFees } = await supabase
        .from('placement_fees')
        .select('id, fee_amount, created_at, status')
        .order('created_at', { ascending: false })
        .limit(5);

      recentFees?.forEach(fee => {
        allEvents.push({
          id: `fee-${fee.id}`,
          type: 'placement_fee',
          title: 'Placement Fee Created',
          description: `New placement fee generated`,
          amount: fee.fee_amount,
          timestamp: fee.created_at,
          status: fee.status,
        });
      });

      // Recent commissions
      const { data: recentCommissions } = await supabase
        .from('employee_commissions')
        .select('id, gross_amount, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      recentCommissions?.forEach(comm => {
        allEvents.push({
          id: `comm-${comm.id}`,
          type: 'commission',
          title: comm.status === 'paid' ? 'Commission Paid' : 'Commission Created',
          description: `Recruiter commission ${comm.status}`,
          amount: comm.gross_amount,
          timestamp: comm.created_at,
          status: comm.status,
        });
      });

      // Recent referral payouts
      const { data: recentPayouts } = await supabase
        .from('referral_payouts')
        .select('id, payout_amount, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      recentPayouts?.forEach(payout => {
        allEvents.push({
          id: `payout-${payout.id}`,
          type: 'referral_payout',
          title: payout.status === 'paid' ? 'Payout Completed' : 'Payout Pending',
          description: `Referral reward ${payout.status}`,
          amount: payout.payout_amount,
          timestamp: payout.created_at,
          status: payout.status,
        });
      });

      // Sort by timestamp descending
      return allEvents.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ).slice(0, 15);
    },
  });

  const getEventIcon = (type: string, status?: string) => {
    switch (type) {
      case 'invoice_paid':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'placement_fee':
        return <DollarSign className="h-4 w-4 text-primary" />;
      case 'commission':
        return status === 'paid' 
          ? <CheckCircle className="h-4 w-4 text-success" />
          : <Clock className="h-4 w-4 text-warning" />;
      case 'referral_payout':
        return status === 'paid'
          ? <Gift className="h-4 w-4 text-success" />
          : <Clock className="h-4 w-4 text-warning" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      paid: 'default',
      pending: 'secondary',
      approved: 'default',
      rejected: 'destructive',
    };

    return (
      <Badge variant={variants[status] || 'outline'} className="text-xs">
        {status}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-1" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Financial Activity</CardTitle>
        <CardDescription>Latest transactions and events</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {events?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mb-2" />
              <p>No recent financial activity</p>
            </div>
          ) : (
            <div className="space-y-4">
              {events?.map((event, index) => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 pb-4 border-b last:border-0"
                >
                  <div className="mt-1 p-2 rounded-full bg-muted">
                    {getEventIcon(event.type, event.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{event.title}</span>
                      {getStatusBadge(event.status)}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {event.description}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(parseISO(event.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                  {event.amount && (
                    <div className="text-right">
                      <span className="font-semibold text-sm">
                        {formatCurrency(event.amount)}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
