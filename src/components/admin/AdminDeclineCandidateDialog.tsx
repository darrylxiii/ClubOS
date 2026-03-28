import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Loader2,
  ShieldX,
  Building2,
  UserX,
  Ghost,
  Lock,
  Handshake,
} from 'lucide-react';
import {
  DECLINE_SOURCES,
  REJECTION_REASONS,
  type DeclineSource,
} from '@/constants/declineSources';

const DECLINE_SOURCE_ICONS: Record<string, React.ReactNode> = {
  shield: <ShieldX className="h-4 w-4" />,
  building: <Building2 className="h-4 w-4" />,
  'user-x': <UserX className="h-4 w-4" />,
  ghost: <Ghost className="h-4 w-4" />,
  lock: <Lock className="h-4 w-4" />,
  handshake: <Handshake className="h-4 w-4" />,
};

const SKILL_TAGS = [
  'React', 'TypeScript', 'Node.js', 'Python', 'Leadership',
  'Communication', 'Problem Solving', 'Team Management', 'Design',
  'Product Strategy', 'Data Analysis', 'Agile', 'DevOps',
];

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
  onComplete: () => void;
}

export function AdminDeclineCandidateDialog({
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
  onComplete,
}: Props) {
  const { t } = useTranslation('common');
  const [submitting, setSubmitting] = useState(false);
  const [declineSource, setDeclineSource] = useState<DeclineSource | ''>('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [feedbackText, setFeedbackText] = useState('');
  const [specificGaps, setSpecificGaps] = useState<string[]>([]);
  const [salaryMismatch, setSalaryMismatch] = useState(false);
  const [locationMismatch, setLocationMismatch] = useState(false);

  const resetForm = () => {
    setDeclineSource('');
    setRejectionReason('');
    setFeedbackText('');
    setSpecificGaps([]);
    setSalaryMismatch(false);
    setLocationMismatch(false);
  };

  useEffect(() => {
    if (open) resetForm();
  }, [open]);

  const toggleSkillTag = (tag: string) => {
    setSpecificGaps((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  // Filter rejection reasons based on decline source
  const filteredReasons = REJECTION_REASONS.filter((r) => {
    if (declineSource === 'candidate_withdrew' || declineSource === 'candidate_unresponsive') {
      return ['better_offer', 'timing', 'salary_high', 'location', 'no_response', 'other'].includes(r.value);
    }
    if (declineSource === 'position_closed') {
      return ['other'].includes(r.value);
    }
    return true;
  });

  const handleSubmit = async () => {
    if (!declineSource) {
      toast.error('Please select who initiated the decline');
      return;
    }
    if (!rejectionReason) {
      toast.error('Please select a reason');
      return;
    }
    if (!feedbackText.trim()) {
      toast.error('Please provide feedback notes — this helps us learn');
      return;
    }

    setSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Resolve candidate profile ID
      let candidateProfileId: string | null = null;
      const { data: candidateById } = await supabase
        .from('candidate_profiles')
        .select('id')
        .eq('id', candidateId)
        .maybeSingle();

      if (candidateById) {
        candidateProfileId = candidateById.id;
      } else {
        const { data: candidateByUserId } = await supabase
          .from('candidate_profiles')
          .select('id')
          .eq('user_id', candidateId)
          .maybeSingle();
        candidateProfileId = candidateByUserId?.id || null;
      }

      // Get company_id
      const { data: jobData } = await supabase
        .from('jobs')
        .select('company_id')
        .eq('id', jobId)
        .maybeSingle();

      const companyId = jobData?.company_id;

      // Determine the application status based on decline source
      const isWithdrawal =
        declineSource === 'candidate_withdrew' || declineSource === 'candidate_unresponsive';
      const newStatus = isWithdrawal ? 'withdrawn' : 'rejected';

      // Determine seniority mismatch from reason
      let seniorityValue: string | null = null;
      if (rejectionReason === 'experience_junior') seniorityValue = 'too_junior';
      if (rejectionReason === 'experience_senior') seniorityValue = 'too_senior';

      // 1. Update application status
      const { error: updateError } = await supabase
        .from('applications')
        .update({
          status: newStatus,
          internal_review_status: isWithdrawal ? undefined : 'rejected',
          internal_reviewed_by: user.id,
          internal_reviewed_at: new Date().toISOString(),
          internal_review_notes: feedbackText.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', applicationId);

      if (updateError) throw updateError;

      // 2. Audit log
      try {
        await supabase.from('pipeline_audit_logs').insert({
          job_id: jobId,
          user_id: user.id,
          action: isWithdrawal ? 'candidate_withdrawn' : 'admin_candidate_declined',
          stage_data: {
            candidate_name: candidateName,
            candidate_id: candidateProfileId,
            stage: currentStage,
            stage_index: currentStageIndex,
            decline_source: declineSource,
            rejection_reason: rejectionReason,
            specific_gaps: specificGaps,
            seniority_mismatch: seniorityValue,
            salary_mismatch: salaryMismatch || rejectionReason === 'salary_high',
            location_mismatch: locationMismatch || rejectionReason === 'location',
          },
          metadata: {
            application_id: applicationId,
            decline_source: declineSource,
            feedback_provided: true,
          },
        });
      } catch (e) {
        console.warn('[Admin Decline] Failed to log audit:', e);
      }

      // 3. Company feedback
      if (companyId) {
        try {
          await supabase.from('company_candidate_feedback').insert({
            company_id: companyId,
            candidate_id: candidateProfileId,
            application_id: applicationId,
            job_id: jobId,
            feedback_type: 'rejection',
            stage_name: currentStage,
            rejection_reason: rejectionReason,
            feedback_text: feedbackText.trim(),
            skills_mismatch: specificGaps.length > 0 ? specificGaps : null,
            salary_mismatch: salaryMismatch || rejectionReason === 'salary_high',
            location_mismatch: locationMismatch || rejectionReason === 'location',
            seniority_mismatch: seniorityValue,
            provided_by: user.id,
            metadata: {
              decline_source: declineSource,
              review_layer: 'admin_decline',
            },
          });
        } catch (e) {
          console.warn('[Admin Decline] Failed to save company feedback:', e);
        }
      }

      // 4. Role feedback
      try {
        await supabase.from('role_candidate_feedback').insert({
          job_id: jobId,
          candidate_id: candidateProfileId,
          application_id: applicationId,
          feedback_type: 'rejection',
          stage_name: currentStage,
          rejection_reason: rejectionReason,
          feedback_text: feedbackText.trim(),
          specific_gaps: specificGaps.length > 0 ? specificGaps : null,
          provided_by: user.id,
          metadata: {
            decline_source: declineSource,
            review_layer: 'admin_decline',
          },
        });
      } catch (e) {
        console.warn('[Admin Decline] Failed to save role feedback:', e);
      }

      // 5. Candidate interaction log
      if (candidateProfileId) {
        try {
          const sourceConfig = DECLINE_SOURCES.find((s) => s.value === declineSource);
          const reasonLabel =
            REJECTION_REASONS.find((r) => r.value === rejectionReason)?.label || rejectionReason;

          await supabase.from('candidate_interactions').insert({
            candidate_id: candidateProfileId,
            application_id: applicationId,
            interaction_type: 'status_change',
            interaction_direction: 'internal',
            title: `${sourceConfig?.shortLabel || 'Declined'} — ${reasonLabel}`,
            content:
              feedbackText.trim() ||
              `Candidate declined for ${jobTitle}. Source: ${sourceConfig?.label}. Reason: ${reasonLabel}`,
            metadata: {
              action: isWithdrawal ? 'withdrawn' : 'admin_decline',
              status: newStatus,
              decline_source: declineSource,
              rejection_reason: rejectionReason,
              rejection_label: reasonLabel,
              stage: currentStage,
              stage_index: currentStageIndex,
              job_id: jobId,
              job_title: jobTitle,
              company_name: companyName,
              specific_gaps: specificGaps,
              seniority_mismatch: seniorityValue,
              salary_mismatch: salaryMismatch || rejectionReason === 'salary_high',
              location_mismatch: locationMismatch || rejectionReason === 'location',
            },
            created_by: user.id,
            is_internal: true,
            visible_to_candidate: false,
          });
        } catch (e) {
          console.warn('[Admin Decline] Failed to log interaction:', e);
        }
      }

      const sourceConfig = DECLINE_SOURCES.find((s) => s.value === declineSource);
      toast.success(`${candidateName} — ${sourceConfig?.shortLabel || 'Declined'}`, {
        duration: 3000,
      });

      onComplete();
      onOpenChange(false);
      resetForm();
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error('[Admin Decline] Error:', error);
      toast.error(err?.message || 'Failed to decline candidate');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedSourceConfig = DECLINE_SOURCES.find((s) => s.value === declineSource);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldX className="h-5 w-5 text-destructive" />
            Admin Decline — {candidateName}
          </DialogTitle>
          <DialogDescription>
            Declining for <span className="font-medium">{jobTitle}</span> at{' '}
            <span className="font-medium">{companyName}</span>
            {currentStage && (
              <>
                {' '}
                (currently at <span className="font-medium">{currentStage}</span>)
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Step 1: Who initiated the decline? */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Who initiated this decline? *</Label>
            <div className="grid grid-cols-2 gap-2">
              {DECLINE_SOURCES.map((source) => (
                <Button
                  key={source.value}
                  type="button"
                  variant={declineSource === source.value ? 'default' : 'outline'}
                  onClick={() => {
                    setDeclineSource(source.value);
                    setRejectionReason('');
                  }}
                  className="justify-start gap-2 h-auto py-3 px-4"
                >
                  <span className={declineSource === source.value ? '' : 'opacity-70'}>
                    {DECLINE_SOURCE_ICONS[source.icon]}
                  </span>
                  <div className="text-left">
                    <div className="text-sm font-medium">{source.label}</div>
                    <div className="text-[11px] opacity-70 font-normal leading-tight">
                      {source.description}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {/* Step 2: Rejection reason (shown after selecting source) */}
          {declineSource && (
            <div className="space-y-3">
              <Label className="text-sm font-semibold">
                {declineSource === 'candidate_withdrew'
                  ? "Why did the candidate withdraw? *"
                  : declineSource === 'candidate_unresponsive'
                    ? "What was the last context? *"
                    : declineSource === 'position_closed'
                      ? "Closing context *"
                      : "Primary reason for decline *"}
              </Label>

              {declineSource === 'position_closed' ? (
                // Position closed doesn't need reason buttons, just notes
                <div className="rounded-lg bg-sky-500/10 border border-sky-500/20 p-3">
                  <p className="text-sm text-muted-foreground">
                    This will mark all context as position-closed. The candidate is not being declined
                    — the role is.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {filteredReasons.map((reason) => (
                    <Button
                      key={reason.value}
                      type="button"
                      variant={rejectionReason === reason.value ? 'default' : 'outline'}
                      onClick={() => setRejectionReason(reason.value)}
                      className="justify-start text-sm"
                    >
                      {reason.label}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Specific gaps (for skills_gap or other) */}
          {declineSource &&
            (rejectionReason === 'skills_gap' || rejectionReason === 'other') &&
            declineSource !== 'candidate_withdrew' &&
            declineSource !== 'candidate_unresponsive' && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Specific Gaps</Label>
                <div className="flex flex-wrap gap-2">
                  {SKILL_TAGS.map((tag) => (
                    <Badge
                      key={tag}
                      variant={specificGaps.includes(tag) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleSkillTag(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

          {/* Step 4: Feedback notes (always required) */}
          {declineSource && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold">
                {declineSource === 'candidate_withdrew'
                  ? "What did the candidate say? *"
                  : declineSource === 'candidate_unresponsive'
                    ? "Outreach history & timeline *"
                    : "Detailed feedback (helps us learn) *"}
              </Label>
              <Textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder={
                  declineSource === 'candidate_withdrew'
                    ? "e.g. Candidate accepted another offer at Company X, mentioned salary was a factor..."
                    : declineSource === 'candidate_unresponsive'
                      ? "e.g. 3 emails sent over 2 weeks, no response after initial phone screen..."
                      : declineSource === 'mutual_decision'
                        ? "e.g. After discussion, both sides agreed the role scope didn't align with career goals..."
                        : "Provide specific reasons to improve our matching and help the team learn..."
                }
                rows={4}
              />
            </div>
          )}

          {/* Source indicator badge */}
          {selectedSourceConfig && (
            <div
              className={`flex items-center gap-2 rounded-lg border p-3 ${selectedSourceConfig.badgeClass}`}
            >
              {DECLINE_SOURCE_ICONS[selectedSourceConfig.icon]}
              <span className="text-sm font-medium">
                This will be recorded as: <strong>{selectedSourceConfig.label}</strong>
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              submitting ||
              !declineSource ||
              (!rejectionReason && declineSource !== 'position_closed') ||
              !feedbackText.trim()
            }
            variant="destructive"
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {declineSource === 'candidate_withdrew'
              ? 'Record Withdrawal'
              : declineSource === 'position_closed'
                ? 'Close Position'
                : 'Decline Candidate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
