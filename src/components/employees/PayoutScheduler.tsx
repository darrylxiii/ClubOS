import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  useCommissionPayouts, 
  useSchedulePayout, 
  useMarkPayoutPaid,
  exportCommissionsToCSV 
} from "@/hooks/useCommissionTiers";
import { toast } from "sonner";
import { format } from "date-fns";
import { 
  DollarSign, 
  Calendar, 
  CheckCircle2, 
  Download,
  Send,
  Loader2,
  CreditCard
} from "lucide-react";

export function PayoutScheduler() {
  const [statusFilter, setStatusFilter] = useState<string>('approved');
  const { data: payouts, isLoading } = useCommissionPayouts(statusFilter);
  const schedulePayout = useSchedulePayout();
  const markPaid = useMarkPayoutPaid();
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [scheduledDate, setScheduledDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [paymentRef, setPaymentRef] = useState('');

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedIds.length === payouts?.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(payouts?.map(p => p.id) || []);
    }
  };

  const handleSchedule = async () => {
    if (!selectedIds.length) {
      toast.error('Select at least one payout');
      return;
    }
    try {
      await schedulePayout.mutateAsync({ 
        ids: selectedIds, 
        scheduledDate 
      });
      setSelectedIds([]);
      toast.success('Payouts scheduled');
    } catch (error) {
      toast.error('Failed to schedule payouts');
    }
  };

  const handleMarkPaid = async () => {
    if (!selectedIds.length) {
      toast.error('Select at least one payout');
      return;
    }
    try {
      await markPaid.mutateAsync({ 
        ids: selectedIds, 
        paymentReference: paymentRef || undefined 
      });
      setSelectedIds([]);
      setPaymentRef('');
      toast.success('Payouts marked as paid');
    } catch (error) {
      toast.error('Failed to mark payouts as paid');
    }
  };

  const totalSelected = payouts
    ?.filter(p => selectedIds.includes(p.id))
    .reduce((sum, p) => sum + (p.net_amount || 0), 0) || 0;

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-amber-500/10 text-amber-500',
      approved: 'bg-blue-500/10 text-blue-500',
      scheduled: 'bg-purple-500/10 text-purple-500',
      paid: 'bg-green-500/10 text-green-500',
    };
    return styles[status] || 'bg-muted text-muted-foreground';
  };

  return (
    <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Payout Scheduler
            </CardTitle>
            <CardDescription>
              Manage and process commission payouts
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => payouts && exportCommissionsToCSV(payouts)}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex items-center gap-2">
          {['approved', 'scheduled', 'paid', 'pending'].map(status => (
            <Button
              key={status}
              variant={statusFilter === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(status)}
              className="capitalize"
            >
              {status}
            </Button>
          ))}
        </div>

        {/* Payouts List */}
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !payouts?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No {statusFilter} payouts</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 pb-2 border-b">
                <Checkbox 
                  checked={selectedIds.length === payouts.length}
                  onCheckedChange={selectAll}
                />
                <span className="text-sm text-muted-foreground">Select All</span>
              </div>
                {payouts.map(payout => (
                <div 
                  key={payout.id}
                  className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
                >
                  <Checkbox
                    checked={selectedIds.includes(payout.id)}
                    onCheckedChange={() => toggleSelect(payout.id)}
                    disabled={payout.status === 'paid'}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {(payout.employee_profiles as any)?.full_name || payout.candidate_name || 'Employee'}
                      </span>
                      <Badge className={getStatusBadge(payout.status)}>
                        {payout.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <span>Gross: €{payout.gross_amount.toLocaleString()}</span>
                      <span>Net: €{payout.net_amount.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">€{payout.net_amount.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Actions */}
        {selectedIds.length > 0 && (
          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span>{selectedIds.length} selected</span>
              <span className="font-bold">Total: €{totalSelected.toLocaleString()}</span>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                />
              </div>
              <Button 
                onClick={handleSchedule}
                disabled={schedulePayout.isPending}
                className="gap-2"
              >
                {schedulePayout.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Calendar className="h-4 w-4" />
                )}
                Schedule
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Input
                  placeholder="Payment reference (optional)"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                />
              </div>
              <Button 
                onClick={handleMarkPaid}
                disabled={markPaid.isPending}
                variant="default"
                className="gap-2 bg-green-600 hover:bg-green-700"
              >
                {markPaid.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Mark Paid
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
