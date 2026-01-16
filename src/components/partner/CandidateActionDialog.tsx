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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { trackCandidateInteraction } from "@/services/sessionTracking";

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
  const [rejectionReason, setRejectionReason] = useState("");

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
          if (userData.user?.id) {
            const { error: commentError } = await supabase
              .from('candidate_comments')
              .insert([{
                application_id: application.id,
                user_id: userData.user.id,
                comment: `Advanced to ${nextStage.name}: ${feedback}`,
                is_internal: true,
              }]);

            if (commentError) throw commentError;
          }
        }

        // Celebration effect for advancement
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#C9A24E', '#F5F4EF', '#6366F1']
        });

        toast.success(`${candidateName} advanced to ${nextStage.name}`, {
          description: "Club Check completed successfully",
          duration: 4000
        });

        // Track advancement
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user?.id) {
          trackCandidateInteraction(userData.user.id, application.candidate_id || application.id, 'advance');
        }
      } else if (action === 'reject') {
        if (!rejectionReason && !feedback.trim()) {
          toast.error("Please provide a rejection reason");
          setLoading(false);
          return;
        }
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
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user?.id) {
          const rejectionComment = rejectionReason
            ? `Rejected - ${rejectionReason}${feedback.trim() ? `: ${feedback}` : ''}`
            : `Rejected: ${feedback}`;

          const { error: commentError } = await supabase
            .from('candidate_comments')
            .insert([{
              application_id: application.id,
              user_id: userData.user.id,
              comment: rejectionComment,
              is_internal: false,
            }]);

          if (commentError) throw commentError;
        }

        if (commentError) throw commentError;

        toast.success(`${candidateName} has been rejected`, {
          description: "Feedback recorded and candidate notified",
          duration: 4000
        });

        // Track rejection
        if (userData.user?.id) {
          trackCandidateInteraction(userData.user.id, application.candidate_id || application.id, 'reject');
        }
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
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-xl">
            {action === 'advance' ? (
              <>
                <CheckCircle2 className="w-6 h-6 text-green-500" />
                <span className="text-foreground font-semibold">
                  Club Check - Advance Candidate
                </span>
              </>
            ) : (
              'Reject Candidate'
            )}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            {action === 'advance' ? (
              <div className="space-y-2 pt-2">
                <p>
                  Move <strong className="text-foreground">{candidateName}</strong> from{" "}
                  <strong className="text-foreground">{currentStage?.name}</strong> to{" "}
                  <strong className="text-accent">{nextStage?.name}</strong>
                </p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-accent/10 p-3 rounded-lg">
                  <Sparkles className="w-4 h-4 text-accent" />
                  <span>This candidate has passed Club vetting standards</span>
                </div>
              </div>
            ) : (
              <p>
                Reject <strong className="text-foreground">{candidateName}</strong>. This action will
                notify the candidate with your feedback.
              </p>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {action === 'reject' && (
            <div className="space-y-2">
              <Label htmlFor="reason">Rejection Reason *</Label>
              <Select value={rejectionReason} onValueChange={setRejectionReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Not a fit">Not a fit</SelectItem>
                  <SelectItem value="Salary expectations">Salary expectations</SelectItem>
                  <SelectItem value="Location">Location</SelectItem>
                  <SelectItem value="Seniority mismatch">Seniority mismatch</SelectItem>
                  <SelectItem value="Skills gap">Skills gap</SelectItem>
                  <SelectItem value="Cultural fit">Cultural fit</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="feedback">
              {action === 'advance'
                ? 'Additional Notes (optional)'
                : 'Detailed Feedback (will be shared with candidate) *'}
            </Label>
            <Textarea
              id="feedback"
              placeholder={
                action === 'advance'
                  ? 'Why are you advancing this candidate? (Optional)'
                  : 'Provide constructive feedback to help the candidate improve...'
              }
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={loading}
            className={
              action === 'reject'
                ? 'bg-destructive hover:bg-destructive/90'
                : 'bg-gradient-to-r from-accent to-primary hover:from-accent/90 hover:to-primary/90'
            }
          >
            {loading ? 'Processing...' : action === 'advance' ? '✓ Advance to ' + nextStage?.name : 'Reject Candidate'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
