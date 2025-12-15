import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  AlertTriangle, FileText, Scale, MessageSquare, 
  Clock, CheckCircle2, XCircle, Upload, Eye,
  ArrowRight, Shield
} from "lucide-react";

interface DisputeCenterProps {
  contractId: string;
}

interface Dispute {
  id: string;
  title: string;
  description: string;
  dispute_type: string;
  status: string;
  amount_in_dispute: number;
  requested_outcome: string;
  resolution_type: string | null;
  resolution_notes: string | null;
  created_at: string;
  resolved_at: string | null;
  raised_by: {
    id: string;
    full_name: string;
  };
}

const DISPUTE_TYPES = [
  { value: "quality", label: "Quality Issues", description: "Work doesn't meet requirements" },
  { value: "non_payment", label: "Non-Payment", description: "Client hasn't released payment" },
  { value: "scope_creep", label: "Scope Creep", description: "Requirements changed after agreement" },
  { value: "communication", label: "Communication", description: "Unresponsive or unclear communication" },
  { value: "deadline", label: "Missed Deadline", description: "Work not delivered on time" },
  { value: "other", label: "Other", description: "Other issues not listed above" },
];

const REQUESTED_OUTCOMES = [
  { value: "full_refund", label: "Full Refund" },
  { value: "partial_refund", label: "Partial Refund" },
  { value: "completion", label: "Complete the Work" },
  { value: "mediation", label: "Platform Mediation" },
];

export function DisputeCenter({ contractId }: DisputeCenterProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    dispute_type: "",
    amount_in_dispute: 0,
    requested_outcome: "",
    evidence_files: [] as { name: string; url: string }[],
  });

  const { data: disputes, isLoading } = useQuery({
    queryKey: ["contract-disputes", contractId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_disputes")
        .select(`
          *,
          raised_by:profiles!project_disputes_raised_by_fkey(id, full_name)
        `)
        .eq("contract_id", contractId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Dispute[];
    },
  });

  const { data: contract } = useQuery({
    queryKey: ["contract-for-dispute", contractId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("freelance_contracts")
        .select("*")
        .eq("id", contractId)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  const createDisputeMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!user?.id) throw new Error("Not authenticated");
      
      const { error } = await (supabase as any)
        .from("project_disputes")
        .insert({
          contract_id: contractId,
          raised_by: user.id,
          against_user_id: user.id, // Will be updated properly
          title: data.title,
          description: data.description,
          dispute_type: data.dispute_type,
          amount_in_dispute: data.amount_in_dispute,
          requested_outcome: data.requested_outcome,
          evidence_files: data.evidence_files,
          status: "open",
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract-disputes"] });
      setShowCreateDialog(false);
      setFormData({
        title: "",
        description: "",
        dispute_type: "",
        amount_in_dispute: 0,
        requested_outcome: "",
        evidence_files: [],
      });
      toast.success("Dispute submitted successfully");
    },
    onError: (error) => {
      toast.error("Failed to submit dispute: " + error.message);
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge className="bg-yellow-100 text-yellow-800">Open</Badge>;
      case "under_review":
        return <Badge className="bg-blue-100 text-blue-800">Under Review</Badge>;
      case "mediation":
        return <Badge className="bg-purple-100 text-purple-800">In Mediation</Badge>;
      case "resolved":
        return <Badge className="bg-green-100 text-green-800">Resolved</Badge>;
      case "closed":
        return <Badge variant="outline">Closed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const hasOpenDispute = disputes?.some(d => d.status === "open" || d.status === "under_review");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Dispute Resolution Center
          </h3>
          <p className="text-sm text-muted-foreground">
            Resolve issues fairly with platform mediation
          </p>
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              className="gap-2"
              disabled={hasOpenDispute}
            >
              <AlertTriangle className="h-4 w-4" />
              Raise a Dispute
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Raise a Dispute</DialogTitle>
              <DialogDescription>
                Describe the issue and we'll help mediate a fair resolution
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Dispute Type */}
              <div>
                <Label>Type of Issue</Label>
                <Select
                  value={formData.dispute_type}
                  onValueChange={(value) => setFormData({ ...formData, dispute_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select issue type" />
                  </SelectTrigger>
                  <SelectContent>
                    {DISPUTE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div>
                          <p>{type.label}</p>
                          <p className="text-xs text-muted-foreground">{type.description}</p>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Title */}
              <div>
                <Label>Issue Title</Label>
                <Input
                  placeholder="Brief summary of the issue"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              {/* Description */}
              <div>
                <Label>Detailed Description</Label>
                <Textarea
                  placeholder="Explain the issue in detail. Include dates, communications, and specific examples..."
                  rows={5}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              {/* Amount */}
              <div>
                <Label>Amount in Dispute (€)</Label>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={formData.amount_in_dispute || ""}
                  onChange={(e) => setFormData({ ...formData, amount_in_dispute: parseFloat(e.target.value) || 0 })}
                />
              </div>

              {/* Requested Outcome */}
              <div>
                <Label>Requested Resolution</Label>
                <Select
                  value={formData.requested_outcome}
                  onValueChange={(value) => setFormData({ ...formData, requested_outcome: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="What outcome are you seeking?" />
                  </SelectTrigger>
                  <SelectContent>
                    {REQUESTED_OUTCOMES.map((outcome) => (
                      <SelectItem key={outcome.value} value={outcome.value}>
                        {outcome.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Evidence Upload */}
              <div>
                <Label>Evidence (optional)</Label>
                <div className="mt-2 border-2 border-dashed rounded-lg p-4 text-center">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Drag files here or click to upload
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Screenshots, documents, or communications
                  </p>
                </div>
              </div>

              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Both parties will be notified and given a chance to respond.
                  Our team will review and mediate if needed.
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createDisputeMutation.mutate(formData)}
                disabled={
                  createDisputeMutation.isPending ||
                  !formData.title ||
                  !formData.description ||
                  !formData.dispute_type
                }
              >
                {createDisputeMutation.isPending ? "Submitting..." : "Submit Dispute"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Info Card */}
      {!hasOpenDispute && (!disputes || disputes.length === 0) && (
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <Scale className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold mb-1">Fair Resolution Process</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  If you're experiencing issues with this contract, you can raise a dispute.
                  Our platform will help mediate and find a fair resolution.
                </p>
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    24-48h response time
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    Both parties can respond
                  </span>
                  <span className="flex items-center gap-1">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    Fair mediation
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Disputes List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="h-24 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : disputes && disputes.length > 0 ? (
        <div className="space-y-4">
          {disputes.map((dispute) => (
            <DisputeCard 
              key={dispute.id} 
              dispute={dispute} 
              currentUserId={user?.id}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function DisputeCard({ dispute, currentUserId }: { dispute: Dispute; currentUserId?: string }) {
  const isRaisedByMe = dispute.raised_by.id === currentUserId;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge className="bg-yellow-100 text-yellow-800">Open</Badge>;
      case "under_review":
        return <Badge className="bg-blue-100 text-blue-800">Under Review</Badge>;
      case "mediation":
        return <Badge className="bg-purple-100 text-purple-800">In Mediation</Badge>;
      case "resolved":
        return <Badge className="bg-green-100 text-green-800">Resolved</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${
              dispute.status === "resolved" ? "bg-green-100" :
              dispute.status === "open" ? "bg-yellow-100" :
              "bg-blue-100"
            }`}>
              {dispute.status === "resolved" ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              )}
            </div>
            <div>
              <h4 className="font-semibold">{dispute.title}</h4>
              <p className="text-sm text-muted-foreground">
                Raised by {isRaisedByMe ? "you" : dispute.raised_by.full_name} •{" "}
                {formatDistanceToNow(new Date(dispute.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
          {getStatusBadge(dispute.status)}
        </div>

        <p className="text-muted-foreground text-sm mb-4">{dispute.description}</p>

        <div className="grid grid-cols-3 gap-4 text-sm mb-4">
          <div>
            <p className="text-muted-foreground">Type</p>
            <p className="font-medium capitalize">{dispute.dispute_type.replace("_", " ")}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Amount</p>
            <p className="font-medium">€{dispute.amount_in_dispute?.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Requested</p>
            <p className="font-medium capitalize">{dispute.requested_outcome?.replace("_", " ")}</p>
          </div>
        </div>

        {dispute.resolution_notes && (
          <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg mt-4">
            <p className="text-sm font-medium text-green-900 dark:text-green-100 mb-1">
              Resolution
            </p>
            <p className="text-sm text-green-800 dark:text-green-200">
              {dispute.resolution_notes}
            </p>
          </div>
        )}

        {dispute.status === "open" && (
          <div className="flex gap-2 mt-4 pt-4 border-t">
            <Button variant="outline" size="sm" className="gap-1">
              <MessageSquare className="h-4 w-4" />
              Add Response
            </Button>
            <Button variant="outline" size="sm" className="gap-1">
              <Upload className="h-4 w-4" />
              Add Evidence
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
