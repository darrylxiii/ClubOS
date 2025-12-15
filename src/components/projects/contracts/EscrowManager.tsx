import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Shield, DollarSign, Clock, CheckCircle2, AlertCircle,
  CreditCard, Wallet, ArrowRight, Lock, Unlock,
  RefreshCw, Download, History
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface EscrowManagerProps {
  contractId: string;
}

interface EscrowTransaction {
  id: string;
  type: "deposit" | "release" | "refund" | "fee";
  amount: number;
  status: "pending" | "completed" | "failed";
  description: string;
  created_at: string;
}

export function EscrowManager({ contractId }: EscrowManagerProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showFundDialog, setShowFundDialog] = useState(false);
  const [showReleaseDialog, setShowReleaseDialog] = useState(false);
  const [fundAmount, setFundAmount] = useState("");
  const [releaseNote, setReleaseNote] = useState("");

  const { data: contract, isLoading } = useQuery({
    queryKey: ["contract-escrow", contractId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("freelance_contracts")
        .select(`
          *,
          project:marketplace_projects(*),
          freelancer:profiles!freelance_contracts_freelancer_id_fkey(id, full_name),
          client:profiles!freelance_contracts_client_id_fkey(id, full_name)
        `)
        .eq("id", contractId)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  const { data: milestones } = useQuery({
    queryKey: ["contract-milestones", contractId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_milestones")
        .select("*")
        .eq("contract_id", contractId)
        .order("milestone_number");
      
      if (error) throw error;
      return data;
    },
  });

  // Mock escrow data - in production this would come from Stripe
  const contractValue = (contract as any)?.hourly_rate * 160 || 5000;
  const escrowData = {
    totalFunded: contractValue,
    currentBalance: contractValue * 0.6, // 60% in escrow
    released: contractValue * 0.4, // 40% released
    pending: 0,
    platformFee: contractValue * 0.12, // 12% platform fee
    transactions: [
      { id: "1", type: "deposit" as const, amount: contractValue, status: "completed" as const, description: "Initial funding", created_at: new Date().toISOString() },
      { id: "2", type: "release" as const, amount: contractValue * 0.4, status: "completed" as const, description: "Milestone 1 completed", created_at: new Date().toISOString() },
    ] as EscrowTransaction[],
  };

  const fundEscrowMutation = useMutation({
    mutationFn: async (amount: number) => {
      // In production, this would integrate with Stripe
      toast.info("Stripe payment integration coming soon");
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract-escrow"] });
      setShowFundDialog(false);
      setFundAmount("");
    },
  });

  const releasePaymentMutation = useMutation({
    mutationFn: async ({ milestoneId, amount }: { milestoneId?: string; amount: number }) => {
      // In production, this would integrate with Stripe Connect
      toast.info("Stripe Connect payout integration coming soon");
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract-escrow"] });
      setShowReleaseDialog(false);
      setReleaseNote("");
    },
  });

  const isClient = user?.id === contract?.client_id;
  const isFreelancer = user?.id === contract?.freelancer_id;

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="py-8">
          <div className="h-32 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!contract) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">Contract not found</p>
        </CardContent>
      </Card>
    );
  }

  const progressPercentage = (escrowData.released / escrowData.totalFunded) * 100;

  return (
    <div className="space-y-6">
      {/* Escrow Overview */}
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle>Escrow Protection</CardTitle>
            </div>
            <Badge variant="outline" className="gap-1">
              <Lock className="h-3 w-3" />
              Secured
            </Badge>
          </div>
          <CardDescription>
            Funds are held securely until work is approved
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Balance Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-muted rounded-lg text-center">
              <Wallet className="h-5 w-5 mx-auto text-muted-foreground mb-2" />
              <p className="text-2xl font-bold">€{escrowData.totalFunded.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total Funded</p>
            </div>
            <div className="p-4 bg-primary/10 rounded-lg text-center">
              <Lock className="h-5 w-5 mx-auto text-primary mb-2" />
              <p className="text-2xl font-bold text-primary">€{escrowData.currentBalance.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">In Escrow</p>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg text-center">
              <Unlock className="h-5 w-5 mx-auto text-green-600 mb-2" />
              <p className="text-2xl font-bold text-green-600">€{escrowData.released.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Released</p>
            </div>
            <div className="p-4 bg-muted rounded-lg text-center">
              <DollarSign className="h-5 w-5 mx-auto text-muted-foreground mb-2" />
              <p className="text-2xl font-bold">€{escrowData.platformFee.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Platform Fee (12%)</p>
            </div>
          </div>

          {/* Progress */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Payment Progress</span>
              <span className="text-sm text-muted-foreground">
                {progressPercentage.toFixed(0)}% released
              </span>
            </div>
            <Progress value={progressPercentage} className="h-3" />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            {isClient && (
              <>
                <Dialog open={showFundDialog} onOpenChange={setShowFundDialog}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <CreditCard className="h-4 w-4" />
                      Add Funds
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Fund Escrow</DialogTitle>
                      <DialogDescription>
                        Add funds to the escrow account for this contract
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label>Amount (€)</Label>
                        <Input
                          type="number"
                          value={fundAmount}
                          onChange={(e) => setFundAmount(e.target.value)}
                          placeholder="Enter amount"
                        />
                      </div>
                      <Alert>
                        <Shield className="h-4 w-4" />
                        <AlertDescription>
                          Funds will be held securely until you approve the work
                        </AlertDescription>
                      </Alert>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowFundDialog(false)}>
                        Cancel
                      </Button>
                      <Button
                        onClick={() => fundEscrowMutation.mutate(parseFloat(fundAmount))}
                        disabled={!fundAmount || fundEscrowMutation.isPending}
                      >
                        {fundEscrowMutation.isPending ? "Processing..." : "Fund Escrow"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={showReleaseDialog} onOpenChange={setShowReleaseDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <Unlock className="h-4 w-4" />
                      Release Payment
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Release Payment</DialogTitle>
                      <DialogDescription>
                        Release funds to the freelancer for completed work
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label>Amount to Release</Label>
                        <Input
                          type="number"
                          value={fundAmount}
                          onChange={(e) => setFundAmount(e.target.value)}
                          placeholder="Enter amount"
                          max={escrowData.currentBalance}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Available: €{escrowData.currentBalance.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <Label>Note (optional)</Label>
                        <Textarea
                          value={releaseNote}
                          onChange={(e) => setReleaseNote(e.target.value)}
                          placeholder="Add a note about this payment..."
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowReleaseDialog(false)}>
                        Cancel
                      </Button>
                      <Button
                        onClick={() => releasePaymentMutation.mutate({ amount: parseFloat(fundAmount) })}
                        disabled={!fundAmount || releasePaymentMutation.isPending}
                      >
                        {releasePaymentMutation.isPending ? "Processing..." : "Release Payment"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </>
            )}

            {isFreelancer && (
              <Alert className="flex-1">
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  Payments are released by the client upon work approval
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Milestones with Escrow */}
      {milestones && milestones.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Milestone Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {milestones.map((milestone: any) => (
                <div
                  key={milestone.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-full ${
                      milestone.status === "paid" ? "bg-green-100 text-green-600" :
                      milestone.status === "approved" ? "bg-blue-100 text-blue-600" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {milestone.status === "paid" ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <Clock className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{milestone.title}</p>
                      <p className="text-sm text-muted-foreground">
                        Milestone {milestone.milestone_number}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">€{milestone.amount?.toLocaleString()}</p>
                    <Badge variant={
                      milestone.status === "paid" ? "default" :
                      milestone.status === "approved" ? "secondary" :
                      "outline"
                    }>
                      {milestone.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Transaction History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {escrowData.transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${
                    tx.type === "deposit" ? "bg-green-100 text-green-600" :
                    tx.type === "release" ? "bg-blue-100 text-blue-600" :
                    tx.type === "refund" ? "bg-red-100 text-red-600" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {tx.type === "deposit" ? <ArrowRight className="h-4 w-4" /> :
                     tx.type === "release" ? <Unlock className="h-4 w-4" /> :
                     tx.type === "refund" ? <RefreshCw className="h-4 w-4" /> :
                     <DollarSign className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="font-medium capitalize">{tx.type}</p>
                    <p className="text-sm text-muted-foreground">{tx.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${
                    tx.type === "deposit" ? "text-green-600" :
                    tx.type === "release" ? "text-blue-600" :
                    tx.type === "refund" ? "text-red-600" : ""
                  }`}>
                    {tx.type === "deposit" ? "+" : "-"}€{tx.amount.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
