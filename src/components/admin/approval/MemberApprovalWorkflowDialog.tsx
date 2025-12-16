import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  ApprovalStep, 
  MemberRequest, 
  CandidateProfileData, 
  AssignmentType,
  StaffAssignment,
  PipelineAssignment,
  ExistingApplication
} from "@/types/approval";
import { ApprovalStepIndicator } from "./ApprovalStepIndicator";
import { MergeDetectionStep } from "./MergeDetectionStep";
import { CreateProfileStep } from "./CreateProfileStep";
import { AssignmentTypeStep } from "./AssignmentTypeStep";
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
  
  // Track existing applications from merged candidates
  const [existingApplications, setExistingApplications] = useState<ExistingApplication[]>([]);
  
  // Dual-path assignment state
  const [assignmentType, setAssignmentType] = useState<AssignmentType>('skip');
  const [staffAssignment, setStaffAssignment] = useState<StaffAssignment | null>(null);
  const [pipelineAssignment, setPipelineAssignment] = useState<PipelineAssignment | null>(null);
  
  const [sendEmail, setSendEmail] = useState(true);
  const [sendSMS, setSendSMS] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Prevent duplicate submissions
  const submissionInProgress = useRef(false);

  const handleMergeSelection = (
    merges: Array<{ candidateId: string; userId: string }>,
    applications: ExistingApplication[]
  ) => {
    setMergeActions(merges);
    setExistingApplications(applications);
    setCompletedSteps([...completedSteps, 'detect']);
    if (merges.length > 0) {
      // Skip to assignment after merge
      setCurrentStep('assign');
    } else {
      setCurrentStep('create');
    }
  };

  const handleSkipMerge = () => {
    setMergeActions([]);
    setExistingApplications([]);
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

  const handleAssignment = (
    type: AssignmentType,
    staff: StaffAssignment | null,
    pipeline: PipelineAssignment | null
  ) => {
    setAssignmentType(type);
    setStaffAssignment(staff);
    setPipelineAssignment(pipeline);
    setCompletedSteps([...completedSteps, 'assign']);
    setCurrentStep('confirm');
  };

  const handleConfirmApproval = async () => {
    // Guard against duplicate submissions
    if (submissionInProgress.current || isSubmitting) {
      console.log('[MemberApproval] Submission already in progress, ignoring duplicate');
      return;
    }

    // Validate admin ID is set
    if (!adminId) {
      toast.error('Admin ID is missing. Please refresh and try again.');
      return;
    }

    // Set both guards
    submissionInProgress.current = true;
    setIsSubmitting(true);
    
    try {
      const result = await memberApprovalService.executeApprovalWorkflow({
        requestId: request.id,
        adminId,
        mergeActions,
        createProfile: profileData || undefined,
        assignmentType,
        staffAssignment: staffAssignment || undefined,
        pipelineAssignment: pipelineAssignment || undefined,
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
      submissionInProgress.current = false;
    }
  };

  // Prevent dialog close during submission
  const handleOpenChange = (newOpen: boolean) => {
    if (isSubmitting && !newOpen) {
      return;
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent 
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
        onEscapeKeyDown={(e) => isSubmitting && e.preventDefault()}
        onPointerDownOutside={(e) => isSubmitting && e.preventDefault()}
      >
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
          <AssignmentTypeStep
            requestType={request.request_type}
            existingApplications={existingApplications}
            onAssign={handleAssignment}
            onBack={() => setCurrentStep(mergeActions.length > 0 ? 'detect' : 'create')}
          />
        )}

        {currentStep === 'confirm' && (
          <ApprovalConfirmationStep
            summary={{
              action: mergeActions.length > 0 ? 'merge' : 'create',
              mergeCount: mergeActions.length,
              profileCreated: !!profileData,
              assignmentType,
              staffAssignment: staffAssignment || undefined,
              pipelineAssignment: pipelineAssignment || undefined,
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