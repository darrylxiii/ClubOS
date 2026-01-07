import { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ReferralPayout } from "@/hooks/useFinancialData";
import { usePayoutActions } from "@/hooks/usePayoutActions";
import { format } from "date-fns";
import { Search, Check, X, Loader2, CreditCard, Download, Package } from "lucide-react";
import { toast } from "sonner";

interface PayoutApprovalQueueProps {
  payouts: ReferralPayout[];
}

export function PayoutApprovalQueue({ payouts }: PayoutApprovalQueueProps) {
  const [search, setSearch] = useState("");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [markPaidDialogOpen, setMarkPaidDialogOpen] = useState(false);
  const [selectedPayoutId, setSelectedPayoutId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [selectedForBatch, setSelectedForBatch] = useState<Set<string>>(new Set());

  const { approvePayout, rejectPayout, markPaid, isLoading } = usePayoutActions();

  const filteredPayouts = payouts.filter((payout) =>
    payout.referrer_user_id.toLowerCase().includes(search.toLowerCase())
  );

  const pendingPayouts = filteredPayouts.filter(p => p.status === 'pending');
  const approvedPayouts = filteredPayouts.filter(p => p.status === 'approved');
  const otherPayouts = filteredPayouts.filter(p => !['pending', 'approved'].includes(p.status));

  // Batch selection calculations
  const selectedBatchPayouts = approvedPayouts.filter(p => selectedForBatch.has(p.id));
  const batchTotal = useMemo(() => 
    selectedBatchPayouts.reduce((sum, p) => sum + p.payout_amount, 0),
    [selectedBatchPayouts]
  );

  const toggleBatchSelect = (payoutId: string) => {
    setSelectedForBatch(prev => {
      const next = new Set(prev);
      if (next.has(payoutId)) {
        next.delete(payoutId);
      } else {
        next.add(payoutId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedForBatch.size === approvedPayouts.length) {
      setSelectedForBatch(new Set());
    } else {
      setSelectedForBatch(new Set(approvedPayouts.map(p => p.id)));
    }
  };

  const exportBatchCSV = () => {
    if (selectedBatchPayouts.length === 0) {
      toast.error("Select at least one payout to export");
      return;
    }

    const headers = ['Recipient ID', 'Amount (EUR)', 'Payment Method', 'Reference'];
    const rows = selectedBatchPayouts.map(p => [
      p.referrer_user_id,
      p.payout_amount.toFixed(2),
      p.payment_method || 'Bank Transfer',
      `TQC-REF-${p.id.substring(0, 8).toUpperCase()}`
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payout-batch-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success(`Exported ${selectedBatchPayouts.length} payouts (€${batchTotal.toFixed(2)})`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-500/10 text-green-700 dark:text-green-400';
      case 'approved': return 'bg-blue-500/10 text-blue-700 dark:text-blue-400';
      case 'processing': return 'bg-purple-500/10 text-purple-700 dark:text-purple-400';
      case 'pending': return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400';
      case 'rejected': return 'bg-red-500/10 text-red-700 dark:text-red-400';
      case 'cancelled': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const handleApprove = (payoutId: string) => {
    approvePayout(payoutId);
  };

  const handleRejectClick = (payoutId: string) => {
    setSelectedPayoutId(payoutId);
    setRejectionReason("");
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = () => {
    if (selectedPayoutId) {
      rejectPayout(selectedPayoutId, rejectionReason);
      setRejectDialogOpen(false);
      setSelectedPayoutId(null);
      setRejectionReason("");
    }
  };

  const handleMarkPaidClick = (payoutId: string) => {
    setSelectedPayoutId(payoutId);
    setPaymentReference("");
    setMarkPaidDialogOpen(true);
  };

  const handleMarkPaidConfirm = () => {
    if (selectedPayoutId) {
      markPaid(selectedPayoutId, paymentReference);
      setMarkPaidDialogOpen(false);
      setSelectedPayoutId(null);
      setPaymentReference("");
    }
  };


  return (
    <div className="space-y-6">
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
        <div>
          <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
            <span className="h-2 w-2 bg-yellow-500 rounded-full animate-pulse" />
            Pending Approval ({pendingPayouts.length})
          </h3>
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
                    <TableCell className="font-medium font-mono text-sm">
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
                        <Button 
                          size="sm" 
                          variant="default"
                          onClick={() => handleApprove(payout.id)}
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Check className="h-4 w-4 mr-1" />
                              Approve
                            </>
                          )}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleRejectClick(payout.id)}
                          disabled={isLoading}
                        >
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
      )}

      {approvedPayouts.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <span className="h-2 w-2 bg-blue-500 rounded-full" />
              Approved - Awaiting Payment ({approvedPayouts.length})
            </h3>
            {selectedForBatch.size > 0 && (
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="gap-1">
                  <Package className="h-3 w-3" />
                  {selectedForBatch.size} selected · {formatCurrency(batchTotal)}
                </Badge>
                <Button size="sm" variant="outline" onClick={exportBatchCSV}>
                  <Download className="h-4 w-4 mr-1" />
                  Export Batch
                </Button>
              </div>
            )}
          </div>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox 
                      checked={selectedForBatch.size === approvedPayouts.length && approvedPayouts.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Approved</TableHead>
                  <TableHead>Referrer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {approvedPayouts.map((payout) => (
                  <TableRow key={payout.id} className={selectedForBatch.has(payout.id) ? 'bg-muted/50' : ''}>
                    <TableCell>
                      <Checkbox 
                        checked={selectedForBatch.has(payout.id)}
                        onCheckedChange={() => toggleBatchSelect(payout.id)}
                      />
                    </TableCell>
                    <TableCell>
                      {payout.approved_at 
                        ? format(new Date(payout.approved_at), 'MMM dd, yyyy')
                        : format(new Date(payout.created_at), 'MMM dd, yyyy')
                      }
                    </TableCell>
                    <TableCell className="font-medium font-mono text-sm">
                      {payout.referrer_user_id.substring(0, 8)}...
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(payout.payout_amount)}
                    </TableCell>
                    <TableCell>
                      {payout.payment_method || 'Bank transfer'}
                    </TableCell>
                    <TableCell>
                      <Button 
                        size="sm" 
                        variant="default"
                        onClick={() => handleMarkPaidClick(payout.id)}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <CreditCard className="h-4 w-4 mr-1" />
                            Mark Paid
                          </>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {otherPayouts.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-2">Payment History</h3>
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
                    <TableCell className="font-medium font-mono text-sm">
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
      )}

      {filteredPayouts.length === 0 && (
        <div className="text-center text-muted-foreground py-8 border rounded-lg">
          No referral payouts found
        </div>
      )}

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Payout</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder="Reason for rejection (optional)"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-red-600 hover:bg-red-700 text-white" 
              onClick={handleRejectConfirm} 
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Reject Payout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark Paid Dialog */}
      <Dialog open={markPaidDialogOpen} onOpenChange={setMarkPaidDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Paid</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder="Payment reference (e.g., bank transfer ID)"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMarkPaidDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleMarkPaidConfirm} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
