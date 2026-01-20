import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/revenueCalculations";
import { ReferralEarning } from "@/hooks/useReferralSystem";
import { formatDistanceToNow, format } from "date-fns";
import { Euro, TrendingUp, Clock, CheckCircle2 } from "lucide-react";

interface EarningsHistoryTableProps {
  earnings: ReferralEarning[];
  loading?: boolean;
}

export function EarningsHistoryTable({ earnings, loading }: EarningsHistoryTableProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-success/10 text-success border-success/30">Paid</Badge>;
      case 'pending_payment':
        return <Badge className="bg-warning/10 text-warning border-warning/30">Pending Payment</Badge>;
      case 'qualified':
        return <Badge className="bg-info/10 text-info border-info/30">Qualified</Badge>;
      case 'projected':
        return <Badge variant="secondary">Projected</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Calculate summary stats
  const totalEarned = earnings
    .filter(e => e.status === 'paid')
    .reduce((sum, e) => sum + (e.earned_amount || 0), 0);
  const pendingPayment = earnings
    .filter(e => e.status === 'pending_payment')
    .reduce((sum, e) => sum + (e.earned_amount || 0), 0);
  const projected = earnings
    .filter(e => e.status === 'projected' || e.status === 'qualified')
    .reduce((sum, e) => sum + (e.weighted_amount || 0), 0);

  if (loading) {
    return (
      <Card className="glass-card">
        <CardContent className="py-12 text-center">
          <div className="animate-pulse text-muted-foreground">Loading earnings history...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-success/10">
              <CheckCircle2 className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Earned</p>
              <p className="text-xl font-bold text-success">{formatCurrency(totalEarned)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-warning/10">
              <Clock className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending Payment</p>
              <p className="text-xl font-bold text-warning">{formatCurrency(pendingPayment)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-info/10">
              <TrendingUp className="h-5 w-5 text-info" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Projected</p>
              <p className="text-xl font-bold text-info">{formatCurrency(projected)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Earnings Table */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg">Earnings History</CardTitle>
        </CardHeader>
        <CardContent>
          {earnings.length === 0 ? (
            <div className="text-center py-8">
              <Euro className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">No earnings yet</p>
              <p className="text-sm text-muted-foreground">Start claiming referrals to track your earnings</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Job / Company</TableHead>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Placement Fee</TableHead>
                    <TableHead>Your Share</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {earnings.map((earning) => (
                    <TableRow key={earning.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(earning.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{earning.job?.title || 'N/A'}</p>
                          <p className="text-xs text-muted-foreground">{earning.company?.name}</p>
                        </div>
                      </TableCell>
                      <TableCell>{earning.candidate?.full_name || '-'}</TableCell>
                      <TableCell>{formatCurrency(earning.placement_fee_total)}</TableCell>
                      <TableCell>{earning.referrer_share_percentage}%</TableCell>
                      <TableCell className="font-medium">
                        {earning.status === 'paid' || earning.status === 'pending_payment'
                          ? formatCurrency(earning.earned_amount)
                          : formatCurrency(earning.weighted_amount)}
                      </TableCell>
                      <TableCell>{getStatusBadge(earning.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
