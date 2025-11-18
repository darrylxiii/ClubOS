import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ApprovalStep, MemberRequest, CandidateProfileData, JobAssignment } from "@/types/approval";
import { ApprovalStepIndicator } from "./ApprovalStepIndicator";
import { MergeDetectionStep } from "./MergeDetectionStep";
import { CreateProfileStep } from "./CreateProfileStep";
import { AssignToJobStep } from "./AssignToJobStep";
import { ApprovalConfirmationStep } from "./ApprovalConfirmationStep";
import { memberApprovalService } from "@/services/memberApprovalService";
import { toast } from "sonner";

interface MemberApprovalWorkflowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: MemberRequest;
  adminId: string;
  onSuccess: () => void;
}

export const MemberApprovalWorkflowDialog = ({
  open,
  onOpenChange,
  request,
  adminId,
  onSuccess,
}: MemberApprovalWorkflowDialogProps) => {
  const [currentStep, setCurrentStep] = useState<ApprovalStep>('detect');
  const [completedSteps, setCompletedSteps] = useState<ApprovalStep[]>([]);
  const [mergeActions, setMergeActions] = useState<Array<{ candidateId: string; userId: string }>>([]);
  const [profileData, setProfileData] = useState<CandidateProfileData | null>(null);
  const [jobAssignment, setJobAssignment] = useState<JobAssignment | null>(null);
  const [sendEmail, setSendEmail] = useState(true);
  const [sendSMS, setSendSMS] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [skipJobAssignment, setSkipJobAssignment] = useState(false);

  const handleMergeSelection = (merges: Array<{ candidateId: string; userId: string }>) => {
    setMergeActions(merges);
    setCompletedSteps([...completedSteps, 'detect']);
    if (merges.length > 0) {
      // Skip to job assignment after merge
      setCurrentStep('assign');
    } else {
      setCurrentStep('create');
    }
  };

  const handleSkipMerge = () => {
    setMergeActions([]);
    setCompletedSteps([...completedSteps, 'detect']);
    setCurrentStep('create');
  };

  const handleProfileCreated = (data: CandidateProfileData) => {
    setProfileData(data);
    setCompletedSteps([...completedSteps, 'create']);
    setCurrentStep('assign');
  };

  const handleSkipProfile = () => {
    setProfileData(null);
    setCompletedSteps([...completedSteps, 'create']);
    setCurrentStep('assign');
  };

  const handleJobAssignment = (assignment: JobAssignment | null) => {
    setJobAssignment(assignment);
    setSkipJobAssignment(assignment === null);
    setCompletedSteps([...completedSteps, 'assign']);
    setCurrentStep('confirm');
  };

  const handleConfirmApproval = async () => {
    // Validate admin ID is set
    if (!adminId) {
      toast.error('Admin ID is missing. Please refresh and try again.');
      return;
    }

    // Validate at least one action or allow empty approval
    if (mergeActions.length === 0 && !profileData) {
      console.log('[MemberApproval] Approving member without profile creation or merge');
    }

    setIsSubmitting(true);
    try {
      const result = await memberApprovalService.executeApprovalWorkflow({
        requestId: request.id,
        adminId,
        mergeActions,
        createProfile: profileData || undefined,
        assignToJob: jobAssignment || undefined,
        sendNotifications: { email: sendEmail, sms: sendSMS },
      });

      if (result.success) {
        toast.success(result.message);
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error(result.message, {
          description: result.errors?.join(', '),
        });
      }
    } catch (error: any) {
      toast.error('Failed to approve member', {
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Approve Member Request</DialogTitle>
        </DialogHeader>

        <ApprovalStepIndicator currentStep={currentStep} completedSteps={completedSteps} />

        {currentStep === 'detect' && (
          <MergeDetectionStep
            email={request.email}
            name={request.name}
            onSelectMerges={handleMergeSelection}
            onSkip={handleSkipMerge}
          />
        )}

        {currentStep === 'create' && (
          <CreateProfileStep
            request={request}
            adminId={adminId}
            onCreateProfile={handleProfileCreated}
            onSkipProfile={handleSkipProfile}
            onBack={() => setCurrentStep('detect')}
          />
        )}

        {currentStep === 'assign' && (
          <AssignToJobStep
            onAssign={handleJobAssignment}
            onBack={() => setCurrentStep(mergeActions.length > 0 ? 'detect' : 'create')}
          />
        )}

        {currentStep === 'confirm' && (
          <ApprovalConfirmationStep
            summary={{
              action: mergeActions.length > 0 ? 'merge' : 'create',
              mergeCount: mergeActions.length,
              profileCreated: !!profileData,
              jobAssigned: !!jobAssignment,
              jobAssignment: jobAssignment || undefined,
            }}
            sendEmail={sendEmail}
            setSendEmail={setSendEmail}
            sendSMS={sendSMS}
            setSendSMS={setSendSMS}
            onConfirm={handleConfirmApproval}
            onBack={() => setCurrentStep('assign')}
            isSubmitting={isSubmitting}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
