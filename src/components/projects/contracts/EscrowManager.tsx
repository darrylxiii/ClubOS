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
  RefreshCw, History, Loader2, ExternalLink
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
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null);

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

  const { data: transactions } = useQuery({
    queryKey: ["escrow-transactions", contractId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_transactions")
        .select("*")
        .order("transaction_date", { ascending: false })
        .limit(10);
      
      if (error) throw error;
      
      // Map to EscrowTransaction format
      return (data || []).map((tx): EscrowTransaction => ({
        id: tx.id,
        type: tx.notes?.includes("funding") ? "deposit" : 
              tx.notes?.includes("Milestone") ? "release" : 
              tx.notes?.includes("refund") ? "refund" : "fee",
        amount: tx.amount,
        status: tx.status as "pending" | "completed" | "failed",
        description: tx.notes || "Transaction",
        created_at: tx.transaction_date,
      }));
    },
  });

  // Fund escrow via Stripe Checkout
  const fundEscrowMutation = useMutation({
    mutationFn: async (amount: number) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("create-project-escrow", {
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
        },
        body: { contractId, amount },
      });

      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: (data) => {
      if (data.url) {
        toast.success("Redirecting to payment...");
        window.location.href = data.url;
      }
    },
    onError: (error) => {
      toast.error(`Failed to fund escrow: ${error.message}`);
    },
  });

  // Release milestone payment
  const releasePaymentMutation = useMutation({
    mutationFn: async ({ milestoneId }: { milestoneId: string }) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("release-milestone-payment", {
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
        },
        body: { milestoneId, contractId },
      });

      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(`Payment released! €${data.freelancerReceived} sent to freelancer.`);
      queryClient.invalidateQueries({ queryKey: ["contract-escrow"] });
      queryClient.invalidateQueries({ queryKey: ["contract-milestones"] });
      queryClient.invalidateQueries({ queryKey: ["escrow-transactions"] });
      setShowReleaseDialog(false);
      setSelectedMilestoneId(null);
    },
    onError: (error) => {
      toast.error(`Failed to release payment: ${error.message}`);
    },
  });

  const isClient = user?.id === contract?.client_id;
  const isFreelancer = user?.id === contract?.freelancer_id;

  // Calculate escrow stats
  const escrowBalance = (contract as any)?.escrow_amount || 0;
  const escrowFunded = (contract as any)?.escrow_funded || false;
  const totalMilestoneValue = milestones?.reduce((sum, m) => sum + (m.amount || 0), 0) || 0;
  const paidMilestoneValue = milestones
    ?.filter((m) => m.status === "paid")
    .reduce((sum, m) => sum + (m.amount || 0), 0) || 0;
  const approvedMilestones = milestones?.filter((m) => m.status === "approved") || [];
  const platformFee = totalMilestoneValue * 0.12;

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

  const progressPercentage = totalMilestoneValue > 0 
    ? (paidMilestoneValue / totalMilestoneValue) * 100 
    : 0;

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
            <Badge variant="outline" className={`gap-1 ${escrowFunded ? 'bg-green-100 text-green-800' : ''}`}>
              {escrowFunded ? (
                <>
                  <Lock className="h-3 w-3" />
                  Funded
                </>
              ) : (
                <>
                  <AlertCircle className="h-3 w-3" />
                  Not Funded
                </>
              )}
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
              <p className="text-2xl font-bold">€{totalMilestoneValue.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Contract Value</p>
            </div>
            <div className="p-4 bg-primary/10 rounded-lg text-center">
              <Lock className="h-5 w-5 mx-auto text-primary mb-2" />
              <p className="text-2xl font-bold text-primary">€{escrowBalance.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">In Escrow</p>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg text-center">
              <Unlock className="h-5 w-5 mx-auto text-green-600 mb-2" />
              <p className="text-2xl font-bold text-green-600">€{paidMilestoneValue.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Released</p>
            </div>
            <div className="p-4 bg-muted rounded-lg text-center">
              <DollarSign className="h-5 w-5 mx-auto text-muted-foreground mb-2" />
              <p className="text-2xl font-bold">€{platformFee.toLocaleString()}</p>
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
          <div className="flex flex-wrap gap-3">
            {isClient && (
              <>
                <Dialog open={showFundDialog} onOpenChange={setShowFundDialog}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <CreditCard className="h-4 w-4" />
                      {escrowFunded ? "Add More Funds" : "Fund Escrow"}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Fund Escrow</DialogTitle>
                      <DialogDescription>
                        Add funds to the escrow account. You'll be redirected to Stripe to complete payment.
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
                          min="1"
                        />
                        {totalMilestoneValue > 0 && (
                          <Button
                            variant="link"
                            size="sm"
                            className="px-0 h-auto text-xs"
                            onClick={() => setFundAmount(totalMilestoneValue.toString())}
                          >
                            Fund full contract: €{totalMilestoneValue}
                          </Button>
                        )}
                      </div>
                      <Alert>
                        <Shield className="h-4 w-4" />
                        <AlertDescription>
                          Funds are held securely until you approve the work. 
                          A 12% platform fee applies when releasing payments.
                        </AlertDescription>
                      </Alert>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowFundDialog(false)}>
                        Cancel
                      </Button>
                      <Button
                        onClick={() => fundEscrowMutation.mutate(parseFloat(fundAmount))}
                        disabled={!fundAmount || parseFloat(fundAmount) <= 0 || fundEscrowMutation.isPending}
                        className="gap-2"
                      >
                        {fundEscrowMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <ExternalLink className="h-4 w-4" />
                            Pay with Stripe
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {approvedMilestones.length > 0 && (
                  <Dialog open={showReleaseDialog} onOpenChange={setShowReleaseDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="gap-2">
                        <Unlock className="h-4 w-4" />
                        Release Payment ({approvedMilestones.length} ready)
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Release Milestone Payment</DialogTitle>
                        <DialogDescription>
                          Select an approved milestone to release payment to the freelancer.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        {approvedMilestones.map((milestone) => (
                          <div
                            key={milestone.id}
                            className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                              selectedMilestoneId === milestone.id 
                                ? 'border-primary bg-primary/5' 
                                : 'hover:border-primary/50'
                            }`}
                            onClick={() => setSelectedMilestoneId(milestone.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">{milestone.title}</p>
                                <p className="text-sm text-muted-foreground">
                                  Milestone {milestone.milestone_number}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold">€{(milestone.amount || 0).toLocaleString()}</p>
                                <p className="text-xs text-muted-foreground">
                                  Freelancer gets: €{((milestone.amount || 0) * 0.88).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowReleaseDialog(false)}>
                          Cancel
                        </Button>
                        <Button
                          onClick={() => selectedMilestoneId && releasePaymentMutation.mutate({ milestoneId: selectedMilestoneId })}
                          disabled={!selectedMilestoneId || releasePaymentMutation.isPending}
                          className="gap-2"
                        >
                          {releasePaymentMutation.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <Unlock className="h-4 w-4" />
                              Release Payment
                            </>
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </>
            )}

            {isFreelancer && (
              <Alert className="flex-1">
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  Payments are released by the client upon milestone approval. 
                  You'll receive 88% of each milestone (12% platform fee).
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
                      milestone.status === "paid" ? "bg-green-100 text-green-600 dark:bg-green-900" :
                      milestone.status === "approved" ? "bg-blue-100 text-blue-600 dark:bg-blue-900" :
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
                    <p className="font-bold">€{(milestone.amount || 0).toLocaleString()}</p>
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
      {transactions && transactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Transaction History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      tx.type === "deposit" ? "bg-green-100 text-green-600 dark:bg-green-900" :
                      tx.type === "release" ? "bg-blue-100 text-blue-600 dark:bg-blue-900" :
                      tx.type === "refund" ? "bg-red-100 text-red-600 dark:bg-red-900" :
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
      )}
    </div>
  );
}
