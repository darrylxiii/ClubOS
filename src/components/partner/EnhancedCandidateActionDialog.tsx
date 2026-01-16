import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, ArrowRight, XCircle } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateId: string;
  candidateName: string;
  applicationId: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
  currentStage: string;
  currentStageIndex: number;
  stages: any[];
  nextStage?: string;
  actionType: 'advance' | 'decline';
  onComplete: () => void;
}

const REJECTION_REASONS = [
  { value: 'skills_gap', label: 'Skills Gap' },
  { value: 'experience_junior', label: 'Too Junior' },
  { value: 'experience_senior', label: 'Too Senior' },
  { value: 'salary_high', label: 'Salary Too High' },
  { value: 'location', label: 'Location Mismatch' },
  { value: 'culture_fit', label: 'Culture Fit Concerns' },
  { value: 'communication', label: 'Communication Issues' },
  { value: 'other', label: 'Other' },
];

const SKILL_TAGS = [
  'React', 'TypeScript', 'Node.js', 'Python', 'Leadership', 
  'Communication', 'Problem Solving', 'Team Management', 'Design',
  'Product Strategy', 'Data Analysis', 'Agile', 'DevOps'
];

export function EnhancedCandidateActionDialog({
  open,
  onOpenChange,
  candidateId,
  candidateName,
  applicationId,
  jobId,
  jobTitle,
  companyName,
  currentStage,
  currentStageIndex,
  stages,
  nextStage,
  actionType,
  onComplete
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  
  // Advancement fields
  const [skillsMatch, setSkillsMatch] = useState([7]);
  const [cultureFit, setCultureFit] = useState([7]);
  const [communication, setCommunication] = useState([7]);
  const [targetStageIndex, setTargetStageIndex] = useState<number | null>(null);
  
  // Rejection fields
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [specificGaps, setSpecificGaps] = useState<string[]>([]);
  const [seniorityMismatch, setSeniorityMismatch] = useState<string>("");
  const [salaryMismatch, setSalaryMismatch] = useState(false);
  const [locationMismatch, setLocationMismatch] = useState(false);

  const resetForm = () => {
    setFeedbackText("");
    setSkillsMatch([7]);
    setCultureFit([7]);
    setCommunication([7]);
    setRejectionReason("");
    setSpecificGaps([]);
    setSeniorityMismatch("");
    setSalaryMismatch(false);
    setLocationMismatch(false);
  };

  // Reset form when dialog opens or actionType changes
  useEffect(() => {
    if (open) {
      resetForm();
      // Set default target to next stage
      if (actionType === 'advance' && currentStageIndex !== undefined) {
        setTargetStageIndex(currentStageIndex + 1);
      }
    }
  }, [open, actionType, currentStageIndex]);

  const handleSubmit = async () => {
    if (actionType === 'decline' && !rejectionReason) {
      toast.error("Please select a rejection reason");
      return;
    }

    if (actionType === 'advance' && targetStageIndex === null) {
      toast.error("Please select a target stage");
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get company_id and candidate_profile_id
      const { data: jobData } = await supabase
        .from('jobs')
        .select('company_id')
        .eq('id', jobId)
        .single();

      const { data: candidateData } = await supabase
        .from('candidate_profiles')
        .select('id')
        .eq('user_id', candidateId)
        .single();

      const companyId = jobData?.company_id;
      const candidateProfileId = candidateData?.id;

      if (actionType === 'advance' && targetStageIndex !== null) {
        // Validate target stage
        if (targetStageIndex < 0 || targetStageIndex >= stages.length) {
          toast.error("Invalid target stage");
          return;
        }

        const targetStage = stages[targetStageIndex];

        // Update application with detailed error logging
        console.log('[Pipeline] Advancing candidate:', {
          applicationId,
          candidateName,
          fromStage: currentStage,
          fromIndex: currentStageIndex,
          toStage: targetStage.name,
          toIndex: targetStageIndex
        });

        const { error: updateError, data: updateData } = await supabase
          .from('applications')
          .update({ 
            current_stage_index: targetStageIndex,
            updated_at: new Date().toISOString()
          })
          .eq('id', applicationId)
          .select()
          .single();

        if (updateError) {
          console.error('[Pipeline] Failed to update application:', {
            error: updateError,
            applicationId,
            targetStageIndex
          });
          toast.error(`Failed to advance candidate: ${updateError.message}`);
          throw updateError;
        }

        console.log('[Pipeline] Successfully updated application:', updateData);

        // Log to pipeline audit log
        await supabase.from('pipeline_audit_logs').insert({
          job_id: jobId,
          user_id: user.id,
          action: 'candidate_advanced',
          stage_data: {
            candidate_name: candidateName,
            candidate_id: candidateProfileId,
            from_stage: currentStage,
            to_stage: targetStage.name,
            from_stage_index: currentStageIndex,
            to_stage_index: targetStageIndex,
            skills_match: skillsMatch[0],
            culture_fit: cultureFit[0],
            communication: communication[0]
          },
          metadata: {
            application_id: applicationId,
            feedback_provided: !!feedbackText,
            feedback_length: feedbackText.length
          }
        });

        // Save advancement feedback to company database
        if (companyId) {
          await supabase.from('company_candidate_feedback').insert({
            company_id: companyId,
            candidate_id: candidateProfileId,
            application_id: applicationId,
            job_id: jobId,
            feedback_type: 'advancement',
            stage_name: currentStage,
            feedback_text: feedbackText,
            rating: (skillsMatch[0] + cultureFit[0] + communication[0]) / 3,
            provided_by: user.id,
            metadata: {
              skills_match: skillsMatch[0],
              culture_fit: cultureFit[0],
              communication: communication[0],
              next_stage: stages[targetStageIndex!].name
            }
          });
        }

        // Save to role database
        await supabase.from('role_candidate_feedback').insert({
          job_id: jobId,
          candidate_id: candidateProfileId,
          application_id: applicationId,
          feedback_type: 'advancement',
          stage_name: currentStage,
          feedback_text: feedbackText,
          skills_match_score: skillsMatch[0],
          experience_match_score: cultureFit[0],
          provided_by: user.id,
          metadata: {
            next_stage: stages[targetStageIndex!].name
          }
        });

        // Log advancement action in interaction log
        await supabase.from('candidate_interactions').insert([{
          candidate_id: candidateProfileId,
          application_id: applicationId,
          interaction_type: 'status_change',
          interaction_direction: 'internal',
          title: `Advanced to ${stages[targetStageIndex!].name}`,
          content: feedbackText || `Candidate advanced from ${currentStage} to ${stages[targetStageIndex!].name} for ${jobTitle}`,
          metadata: {
            action: 'advance',
            previous_stage: currentStage,
            new_stage: stages[targetStageIndex!].name,
            job_id: jobId,
            job_title: jobTitle,
            company_name: companyName,
            skills_match: skillsMatch[0],
            culture_fit: cultureFit[0],
            communication: communication[0]
          },
          created_by: user.id,
          is_internal: true,
          visible_to_candidate: false,
        }] as any);

      } else if (actionType === 'decline') {
        // Update application status with detailed error logging
        console.log('[Pipeline] Declining candidate:', {
          applicationId,
          candidateName,
          currentStage,
          rejectionReason
        });

        const { error: updateError, data: updateData } = await supabase
          .from('applications')
          .update({ 
            status: 'rejected',
            updated_at: new Date().toISOString(),
          })
          .eq('id', applicationId)
          .select()
          .single();

        if (updateError) {
          console.error('[Pipeline] Failed to decline candidate:', {
            error: updateError,
            applicationId
          });
          toast.error(`Failed to decline candidate: ${updateError.message}`);
          throw updateError;
        }

        console.log('[Pipeline] Successfully declined candidate:', updateData);

        // Determine seniority from reason
        let seniorityValue = null;
        if (rejectionReason === 'experience_junior') seniorityValue = 'too_junior';
        if (rejectionReason === 'experience_senior') seniorityValue = 'too_senior';

        // Log to pipeline audit log
        const rejectionLabelForLog = REJECTION_REASONS.find(r => r.value === rejectionReason)?.label || rejectionReason;
        await supabase.from('pipeline_audit_logs').insert({
          job_id: jobId,
          user_id: user.id,
          action: 'candidate_declined',
          stage_data: {
            candidate_name: candidateName,
            candidate_id: candidateProfileId,
            stage: currentStage,
            rejection_reason: rejectionReason,
            rejection_label: rejectionLabelForLog,
            specific_gaps: specificGaps,
            seniority_mismatch: seniorityValue,
            salary_mismatch: salaryMismatch || rejectionReason === 'salary_high',
            location_mismatch: locationMismatch || rejectionReason === 'location'
          },
          metadata: {
            application_id: applicationId,
            feedback_provided: !!feedbackText
          }
        });

        // Save rejection feedback to company database
        if (companyId) {
          await supabase.from('company_candidate_feedback').insert({
            company_id: companyId,
            candidate_id: candidateProfileId,
            application_id: applicationId,
            job_id: jobId,
            feedback_type: 'rejection',
            stage_name: currentStage,
            rejection_reason: rejectionReason,
            feedback_text: feedbackText,
            skills_mismatch: specificGaps,
            salary_mismatch: salaryMismatch || rejectionReason === 'salary_high',
            location_mismatch: locationMismatch || rejectionReason === 'location',
            seniority_mismatch: seniorityValue,
            provided_by: user.id
          });
        }

        // Save to role database
        await supabase.from('role_candidate_feedback').insert({
          job_id: jobId,
          candidate_id: candidateProfileId,
          application_id: applicationId,
          feedback_type: 'rejection',
          stage_name: currentStage,
          rejection_reason: rejectionReason,
          feedback_text: feedbackText,
          specific_gaps: specificGaps,
          provided_by: user.id
        });

        // Log rejection action in interaction log
        const rejectionLabel = REJECTION_REASONS.find(r => r.value === rejectionReason)?.label || rejectionReason;
        await supabase.from('candidate_interactions').insert([{
          candidate_id: candidateProfileId,
          application_id: applicationId,
          interaction_type: 'status_change',
          interaction_direction: 'internal',
          title: `Candidate Rejected - ${rejectionLabel}`,
          content: feedbackText || `Candidate declined for ${jobTitle}. Reason: ${rejectionLabel}`,
          metadata: {
            action: 'reject',
            status: 'rejected',
            rejection_reason: rejectionReason,
            rejection_label: rejectionLabel,
            stage: currentStage,
            job_id: jobId,
            job_title: jobTitle,
            company_name: companyName,
            specific_gaps: specificGaps,
            seniority_mismatch: seniorityValue,
            salary_mismatch: salaryMismatch || rejectionReason === 'salary_high',
            location_mismatch: locationMismatch || rejectionReason === 'location'
          },
          created_by: user.id,
          is_internal: true,
          visible_to_candidate: false,
        }] as any);
      }

      toast.success(
        actionType === 'advance' 
          ? `${candidateName} advanced to ${stages[targetStageIndex!].name}` 
          : `${candidateName} declined`,
        { duration: 3000 }
      );
      
      onComplete();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error('[Pipeline] Error submitting feedback:', {
        error,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code
      });
      
      // Only show error if we haven't already shown one
      if (!error?.message?.includes('Failed to')) {
        toast.error(
          actionType === 'advance'
            ? "Failed to advance candidate. Please check permissions and try again."
            : "Failed to decline candidate. Please check permissions and try again."
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSkillTag = (tag: string) => {
    setSpecificGaps(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {actionType === 'advance' ? (
              <>
                <ArrowRight className="h-5 w-5 text-primary" />
                Advance Candidate
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-destructive" />
                Decline Candidate
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {actionType === 'advance' 
              ? `Moving ${candidateName} forward in the pipeline for ${jobTitle} at ${companyName}`
              : `Declining ${candidateName} for ${jobTitle} at ${companyName}`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {actionType === 'advance' ? (
            <>
              <div className="space-y-4">
                <div>
                  <Label>Skills Match: {skillsMatch[0]}/10</Label>
                  <Slider 
                    value={skillsMatch} 
                    onValueChange={setSkillsMatch}
                    max={10}
                    step={1}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>Culture Fit: {cultureFit[0]}/10</Label>
                  <Slider 
                    value={cultureFit} 
                    onValueChange={setCultureFit}
                    max={10}
                    step={1}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>Communication: {communication[0]}/10</Label>
                  <Slider 
                    value={communication} 
                    onValueChange={setCommunication}
                    max={10}
                    step={1}
                  className="mt-2"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="target-stage">Advance to Stage *</Label>
              <Select 
                value={targetStageIndex?.toString()} 
                onValueChange={(value) => setTargetStageIndex(parseInt(value))}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select target stage..." />
                </SelectTrigger>
                <SelectContent>
                  {stages
                    .filter((stage) => stage.order > currentStageIndex)
                    .map((stage) => (
                      <SelectItem key={stage.order} value={stage.order.toString()}>
                        {stage.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Select which stage to move this candidate to
              </p>
            </div>

            <div>
              <Label htmlFor="advancement-notes">Notes (Optional)</Label>
                <Textarea
                  id="advancement-notes"
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Why are you advancing this candidate? Any key highlights..."
                  rows={3}
                  className="mt-2"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <Label>Primary Rejection Reason *</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {REJECTION_REASONS.map(reason => (
                    <Button
                      key={reason.value}
                      type="button"
                      variant={rejectionReason === reason.value ? "default" : "outline"}
                      onClick={() => setRejectionReason(reason.value)}
                      className="justify-start"
                    >
                      {reason.label}
                    </Button>
                  ))}
                </div>
              </div>

              {(rejectionReason === 'skills_gap' || rejectionReason === 'other') && (
                <div>
                  <Label>Specific Gaps (Select all that apply)</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {SKILL_TAGS.map(tag => (
                      <Badge
                        key={tag}
                        variant={specificGaps.includes(tag) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleSkillTag(tag)}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="rejection-feedback">Detailed Feedback</Label>
                <Textarea
                  id="rejection-feedback"
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Provide specific reasons for rejection to improve our matching..."
                  rows={4}
                  className="mt-2"
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {actionType === 'advance' ? 'Advance Candidate' : 'Decline Candidate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
