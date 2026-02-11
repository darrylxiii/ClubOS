import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Send, Loader2, UserPlus, AlertCircle } from "lucide-react";
import { CandidateSelectorTable } from "./CandidateSelectorTable";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const BulkInvitationTab = () => {
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [customMessage, setCustomMessage] = useState("");

  // Send invitations mutation
  const sendInvitations = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Log the bulk operation
      const { data: log, error: logError } = await supabase
        .from("bulk_operation_logs")
        .insert({
          operation_type: "invitation",
          admin_id: user.id,
          target_count: selectedCandidates.length,
          status: "processing",
          started_at: new Date().toISOString(),
          metadata: { custom_message: customMessage || null },
          target_ids: selectedCandidates,
        })
        .select()
        .single();

      if (logError) throw logError;

      // Get candidates without accounts
      const { data: candidates, error: candidatesError } = await supabase
        .from("candidate_profiles")
        .select("id, email, full_name, user_id")
        .in("id", selectedCandidates)
        .is("user_id", null);

      if (candidatesError) throw candidatesError;

      let successCount = 0;
      let failureCount = 0;
      const errors: any[] = [];

      // Send invitations
      for (const candidate of candidates || []) {
        try {
          const { error } = await supabase.functions.invoke("send-candidate-invitation", {
            body: {
              candidateId: candidate.id,
              customMessage: customMessage || undefined,
            },
          });
          if (error) throw error;
          successCount++;
        } catch (err: unknown) {
          failureCount++;
          errors.push({ candidate_id: candidate.id, error: err instanceof Error ? err.message : 'Unknown error' });
        }
      }

      // Update log
      await supabase
        .from("bulk_operation_logs")
        .update({
          status: "completed",
          success_count: successCount,
          failure_count: failureCount,
          error_details: errors.length > 0 ? { errors } : {},
          completed_at: new Date().toISOString(),
        })
        .eq("id", log.id);

      return { successCount, failureCount, skipped: selectedCandidates.length - (candidates?.length || 0) };
    },
    onSuccess: (result) => {
      let message = `Invitations sent: ${result.successCount} success`;
      if (result.failureCount > 0) message += `, ${result.failureCount} failed`;
      if (result.skipped > 0) message += `, ${result.skipped} skipped (already have accounts)`;
      toast.success(message);
      setSelectedCandidates([]);
    },
    onError: (error: Error) => {
      toast.error(`Failed to send invitations: ${error.message}`);
    },
  });

  return (
    <div className="space-y-6">
      {/* Info Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Platform invitations will only be sent to candidates who don't have an account yet.
          Candidates with existing accounts will be skipped.
        </AlertDescription>
      </Alert>

      {/* Candidate Selection - filter to those without accounts */}
      <div>
        <Label className="mb-2 block">Select Candidates (Without Accounts)</Label>
        <CandidateSelectorTable
          selectedCandidates={selectedCandidates}
          onSelectionChange={setSelectedCandidates}
          filterByHasAccount={false}
        />
      </div>

      {/* Custom Message */}
      <div className="space-y-4 border-t pt-6">
        <div>
          <Label htmlFor="message">Custom Message (Optional)</Label>
          <Textarea
            id="message"
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            placeholder="Add a personalized message to the invitation email..."
            rows={4}
            className="mt-1.5"
          />
        </div>

        <Button
          onClick={() => sendInvitations.mutate()}
          disabled={selectedCandidates.length === 0 || sendInvitations.isPending}
          className="w-full sm:w-auto"
        >
          {sendInvitations.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sending Invitations...
            </>
          ) : (
            <>
              <UserPlus className="h-4 w-4 mr-2" />
              Send {selectedCandidates.length} Invitation{selectedCandidates.length !== 1 ? "s" : ""}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
