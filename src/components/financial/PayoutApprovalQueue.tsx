import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ReferralPayout } from "@/hooks/useFinancialData";
import { format } from "date-fns";
import { Search, Check, X } from "lucide-react";

interface PayoutApprovalQueueProps {
  payouts: ReferralPayout[];
}

export function PayoutApprovalQueue({ payouts }: PayoutApprovalQueueProps) {
  const [search, setSearch] = useState("");

  const filteredPayouts = payouts.filter((payout) =>
    payout.referrer_user_id.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-500/10 text-green-700 dark:text-green-400';
      case 'approved': return 'bg-blue-500/10 text-blue-700 dark:text-blue-400';
      case 'processing': return 'bg-purple-500/10 text-purple-700 dark:text-purple-400';
      case 'pending': return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400';
      case 'rejected': return 'bg-red-500/10 text-red-700 dark:text-red-400';
      case 'cancelled': return 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
      default: return 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const pendingPayouts = filteredPayouts.filter(p => p.status === 'pending');
  const otherPayouts = filteredPayouts.filter(p => p.status !== 'pending');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by referrer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {pendingPayouts.length > 0 && (
        <>
          <div>
            <h3 className="text-sm font-medium mb-2">Pending Approval ({pendingPayouts.length})</h3>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Created</TableHead>
                    <TableHead>Referrer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingPayouts.map((payout) => (
                    <TableRow key={payout.id}>
                      <TableCell>
                        {format(new Date(payout.created_at), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell className="font-medium">
                        {payout.referrer_user_id.substring(0, 8)}...
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(payout.payout_amount)}
                      </TableCell>
                      <TableCell>
                        {payout.payment_method || 'Not specified'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="default">
                            <Check className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button size="sm" variant="outline">
                            <X className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}

      {otherPayouts.length > 0 && (
        <>
          <div>
            <h3 className="text-sm font-medium mb-2">All Payouts</h3>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Created</TableHead>
                    <TableHead>Referrer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Paid Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {otherPayouts.map((payout) => (
                    <TableRow key={payout.id}>
                      <TableCell>
                        {format(new Date(payout.created_at), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell className="font-medium">
                        {payout.referrer_user_id.substring(0, 8)}...
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(payout.payout_amount)}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(payout.status)}>
                          {payout.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {payout.paid_at ? format(new Date(payout.paid_at), 'MMM dd, yyyy') : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}

      {filteredPayouts.length === 0 && (
        <div className="text-center text-muted-foreground py-8 border rounded-lg">
          No referral payouts found
        </div>
      )}
    </div>
  );
}
