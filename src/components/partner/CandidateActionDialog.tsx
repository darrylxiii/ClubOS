import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CandidateActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application: any;
  action: 'advance' | 'reject';
  stages: any[];
  onComplete: () => void;
}

export const CandidateActionDialog = ({
  open,
  onOpenChange,
  application,
  action,
  stages,
  onComplete,
}: CandidateActionDialogProps) => {
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);

  const currentStage = stages.find(s => s.order === application.current_stage_index);
  const nextStage = stages.find(s => s.order === application.current_stage_index + 1);
  const candidateName = application.profiles?.full_name || "this candidate";

  const handleConfirm = async () => {
    setLoading(true);
    try {
      if (action === 'advance') {
        if (!nextStage) {
          toast.error("No next stage available");
          return;
        }

        // Update application stage
        const { error: updateError } = await supabase
          .from('applications')
          .update({
            current_stage_index: nextStage.order,
            updated_at: new Date().toISOString(),
          })
          .eq('id', application.id);

        if (updateError) throw updateError;

        // Add comment if feedback provided
        if (feedback.trim()) {
          const { data: userData } = await supabase.auth.getUser();
          const { error: commentError } = await supabase
            .from('candidate_comments')
            .insert({
              application_id: application.id,
              user_id: userData.user?.id,
              comment: `Advanced to ${nextStage.name}: ${feedback}`,
              is_internal: true,
            });

          if (commentError) throw commentError;
        }

        toast.success(`${candidateName} advanced to ${nextStage.name}`);
      } else if (action === 'reject') {
        // Update application status
        const { error: updateError } = await supabase
          .from('applications')
          .update({
            status: 'rejected',
            updated_at: new Date().toISOString(),
          })
          .eq('id', application.id);

        if (updateError) throw updateError;

        // Add rejection feedback
        if (feedback.trim()) {
          const { data: userData } = await supabase.auth.getUser();
          const { error: commentError } = await supabase
            .from('candidate_comments')
            .insert({
              application_id: application.id,
              user_id: userData.user?.id,
              comment: `Rejected: ${feedback}`,
              is_internal: false, // Make visible to candidate
            });

          if (commentError) throw commentError;
        }

        toast.success(`${candidateName} has been rejected`);
      }

      onComplete();
    } catch (error) {
      console.error('Error processing action:', error);
      toast.error("Failed to process action");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {action === 'advance' ? 'Advance Candidate' : 'Reject Candidate'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {action === 'advance' ? (
              <>
                Are you sure you want to move <strong>{candidateName}</strong> from{" "}
                <strong>{currentStage?.name}</strong> to <strong>{nextStage?.name}</strong>?
              </>
            ) : (
              <>
                Are you sure you want to reject <strong>{candidateName}</strong>? This action will
                notify the candidate.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 py-4">
          <Label htmlFor="feedback">
            {action === 'advance' ? 'Notes (optional)' : 'Feedback (will be shared with candidate)'}
          </Label>
          <Textarea
            id="feedback"
            placeholder={
              action === 'advance'
                ? 'Add any notes about this advancement...'
                : 'Provide constructive feedback to help the candidate...'
            }
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={4}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={loading}
            className={action === 'reject' ? 'bg-destructive hover:bg-destructive/90' : ''}
          >
            {loading ? 'Processing...' : action === 'advance' ? 'Advance Candidate' : 'Reject Candidate'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
