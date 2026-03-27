import { useTranslation } from 'react-i18next';
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MilestoneRevisionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  milestoneId: string;
  onRevisionRequested: () => void;
}

export function MilestoneRevisionModal({
  open,
  onOpenChange,
  milestoneId,
  onRevisionRequested,
}: MilestoneRevisionModalProps) {
  const { t } = useTranslation('common');
  const [feedback, setFeedback] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!feedback.trim()) {
      toast.error(t("please_provide_revision_feedback", "Please provide revision feedback"));
      return;
    }

    setIsSubmitting(true);
    try {
      // First get current revision count
      const { data: milestone } = await (supabase as any)
        .from("project_milestones")
        .select("revision_count")
        .eq("id", milestoneId)
        .single();

      const { error } = await (supabase as any)
        .from("project_milestones")
        .update({
          status: "revision_requested",
          feedback_from_client: feedback,
          revision_count: (milestone?.revision_count || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", milestoneId);

      if (error) throw error;

      toast.success(t("revision_requested_successfully", "Revision requested successfully"));
      setFeedback("");
      setPriority("medium");
      onOpenChange(false);
      onRevisionRequested();
    } catch (error: unknown) {
      console.error("Error requesting revision:", error);
      toast.error(error instanceof Error ? error.message : "Failed to request revision");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("request_milestone_revision", "Request Milestone Revision")}</DialogTitle>
          <DialogDescription>
            Provide feedback on what needs to be changed or improved in this milestone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="priority">{t("priority", "Priority")}</Label>
            <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">{t("low_minor_changes", "Low - Minor changes")}</SelectItem>
                <SelectItem value="medium">{t("medium_some_adjustments_needed", "Medium - Some adjustments needed")}</SelectItem>
                <SelectItem value="high">{t("high_significant_changes_required", "High - Significant changes required")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="feedback">{t("revision_feedback", "Revision Feedback *")}</Label>
            <Textarea
              id="feedback"
              placeholder={t("describe_what_needs_to", "Describe what needs to be changed, improved, or clarified...")}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={6}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Be specific about what needs to be revised to help the freelancer make the necessary changes.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !feedback.trim()}>
            {isSubmitting ? "Submitting..." : "Request Revision"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


