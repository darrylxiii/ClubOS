import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ContractChangeOrder, usePartnerContracts } from "@/hooks/usePartnerContracts";
import { ProjectContract } from "@/types/projects";
import { format } from "date-fns";
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock,
  DollarSign,
  Calendar,
  User
} from "lucide-react";

interface ChangeOrdersPanelProps {
  changeOrders: ContractChangeOrder[];
  contracts: ProjectContract[];
}

export function ChangeOrdersPanel({ changeOrders, contracts }: ChangeOrdersPanelProps) {
  const [selectedOrder, setSelectedOrder] = useState<ContractChangeOrder | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const getContractName = (contractId: string) => {
    const contract = contracts.find(c => c.id === contractId);
    return contract?.project_id || 'Unknown Contract';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'rejected':
        return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      default:
        return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    }
  };

  const pendingOrders = changeOrders.filter(co => co.status === 'pending');
  const processedOrders = changeOrders.filter(co => co.status !== 'pending');

  const handleApprove = async (order: ContractChangeOrder) => {
    // This would call the mutation from the hook
    // For now, we'll just close the dialog
    setSelectedOrder(null);
  };

  const handleReject = async () => {
    if (!selectedOrder || !rejectReason) return;
    // This would call the mutation from the hook
    setShowRejectDialog(false);
    setSelectedOrder(null);
    setRejectReason("");
  };

  return (
    <div className="space-y-6">
      {/* Pending Change Orders */}
      {pendingOrders.length > 0 && (
        <Card className="border-yellow-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Pending Approval ({pendingOrders.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingOrders.map((order) => (
              <div 
                key={order.id}
                className="p-4 border rounded-lg bg-yellow-500/5 border-yellow-500/20"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-medium text-foreground">
                      {getContractName(order.contract_id)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Requested {format(new Date(order.created_at), 'MMM d, yyyy')}
                    </div>
                  </div>
                  <Badge className={`${getStatusColor(order.status)} border`}>
                    {order.status}
                  </Badge>
                </div>

                {order.scope_change && (
                  <div className="mb-3 p-3 bg-background rounded-md">
                    <div className="text-sm text-muted-foreground mb-1">Scope Change:</div>
                    <div className="text-sm text-foreground">{order.scope_change}</div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      Budget Impact: 
                      <span className={order.budget_impact >= 0 ? 'text-green-600 ml-1' : 'text-red-600 ml-1'}>
                        {order.budget_impact >= 0 ? '+' : ''}{formatCurrency(order.budget_impact)}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      Timeline Impact: 
                      <span className={order.timeline_impact_days >= 0 ? 'text-yellow-600 ml-1' : 'text-green-600 ml-1'}>
                        {order.timeline_impact_days >= 0 ? '+' : ''}{order.timeline_impact_days} days
                      </span>
                    </span>
                  </div>
                </div>

                {order.justification && (
                  <div className="mb-4 p-3 bg-muted/30 rounded-md">
                    <div className="text-sm text-muted-foreground mb-1">Justification:</div>
                    <div className="text-sm text-foreground">{order.justification}</div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Button 
                    size="sm"
                    onClick={() => handleApprove(order)}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button 
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedOrder(order);
                      setShowRejectDialog(true);
                    }}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Processed Change Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Change Order History</CardTitle>
        </CardHeader>
        <CardContent>
          {processedOrders.length === 0 && pendingOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No change orders yet
            </div>
          ) : processedOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No processed change orders yet
            </div>
          ) : (
            <div className="space-y-3">
              {processedOrders.map((order) => (
                <div 
                  key={order.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(order.status)}
                    <div>
                      <div className="font-medium">
                        {getContractName(order.contract_id)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {order.scope_change?.substring(0, 60)}
                        {order.scope_change && order.scope_change.length > 60 ? '...' : ''}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className={order.budget_impact >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {order.budget_impact >= 0 ? '+' : ''}{formatCurrency(order.budget_impact)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(order.created_at), 'MMM d')}
                      </div>
                    </div>
                    <Badge className={`${getStatusColor(order.status)} border`}>
                      {order.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Change Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Please provide a reason for rejecting this change order:
            </p>
            <Textarea
              placeholder="Reason for rejection..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={!rejectReason}
            >
              Reject Change Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
