import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  ApprovalStep, 
  MemberRequest, 
  CandidateProfileData, 
  AssignmentType,
  StaffAssignment,
  PipelineAssignment,
  ExistingApplication,
  CompanyAssignmentData
} from "@/types/approval";
import { ApprovalStepIndicator } from "./ApprovalStepIndicator";
import { MergeDetectionStep } from "./MergeDetectionStep";
import { CreateProfileStep } from "./CreateProfileStep";
import { AssignmentTypeStep } from "./AssignmentTypeStep";
import { ApprovalConfirmationStep } from "./ApprovalConfirmationStep";
import { CompanySelectionStep } from "./CompanySelectionStep";
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
  const isPartner = request.request_type === 'partner';
  
  const [currentStep, setCurrentStep] = useState<ApprovalStep>(isPartner ? 'company' : 'detect');
  const [completedSteps, setCompletedSteps] = useState<ApprovalStep[]>([]);
  const [mergeActions, setMergeActions] = useState<Array<{ candidateId: string; userId: string }>>([]);
  const [profileData, setProfileData] = useState<CandidateProfileData | null>(null);
  
  // Track existing applications from merged candidates
  const [existingApplications, setExistingApplications] = useState<ExistingApplication[]>([]);
  
  // Dual-path assignment state
  const [assignmentType, setAssignmentType] = useState<AssignmentType>('skip');
  const [staffAssignment, setStaffAssignment] = useState<StaffAssignment | null>(null);
  const [pipelineAssignment, setPipelineAssignment] = useState<PipelineAssignment | null>(null);
  
  // Partner company assignment state
  const [companyAssignment, setCompanyAssignment] = useState<CompanyAssignmentData | null>(null);
  
  const [sendEmail, setSendEmail] = useState(true);
  const [sendSMS, setSendSMS] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Prevent duplicate submissions
  const submissionInProgress = useRef(false);

  // ── Candidate flow handlers ──
  const handleMergeSelection = (
    merges: Array<{ candidateId: string; userId: string }>,
    applications: ExistingApplication[]
  ) => {
    setMergeActions(merges);
    setExistingApplications(applications);
    setCompletedSteps([...completedSteps, 'detect']);
    if (merges.length > 0) {
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

  // ── Partner flow handlers ──
  const handleCompanySelected = (data: CompanyAssignmentData) => {
    setCompanyAssignment(data);
    setCompletedSteps([...completedSteps, 'company']);
    setCurrentStep('confirm');
  };

  // ── Confirm ──
  const handleConfirmApproval = async () => {
    if (submissionInProgress.current || isSubmitting) {
      return;
    }

    if (!adminId) {
      toast.error('Admin ID is missing. Please refresh and try again.');
      return;
    }

    submissionInProgress.current = true;
    setIsSubmitting(true);
    
    try {
      if (isPartner) {
        // Partner approval via edge function
        const result = await memberApprovalService.executePartnerApprovalWorkflow({
          requestId: request.id,
          adminId,
          companyAssignment: companyAssignment!,
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
      } else {
        // Candidate approval (existing logic)
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
      }
    } catch (error: unknown) {
      toast.error('Failed to approve member', {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setIsSubmitting(false);
      submissionInProgress.current = false;
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (isSubmitting && !newOpen) return;
    onOpenChange(newOpen);
  };

  // Build summary for confirmation step
  const buildSummary = () => {
    if (isPartner && companyAssignment) {
      return {
        action: companyAssignment.companyId ? 'assign_company' as const : 'create_company' as const,
        mergeCount: 0,
        profileCreated: false,
        assignmentType: 'staff' as AssignmentType,
        staffAssignment: {
          role: 'partner' as const,
          companyId: companyAssignment.companyId || undefined,
        },
        companyAssignment,
      };
    }
    return {
      action: mergeActions.length > 0 ? 'merge' as const : 'create' as const,
      mergeCount: mergeActions.length,
      profileCreated: !!profileData,
      assignmentType,
      staffAssignment: staffAssignment || undefined,
      pipelineAssignment: pipelineAssignment || undefined,
    };
  };

  // Extract partner additional data
  const partnerAdditionalData = request.additional_data as { industry?: string; company_size?: string; website?: string } | null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent 
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
        onEscapeKeyDown={(e) => isSubmitting && e.preventDefault()}
        onPointerDownOutside={(e) => isSubmitting && e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>
            {isPartner ? 'Approve Partner Request' : 'Approve Member Request'}
          </DialogTitle>
        </DialogHeader>

        <ApprovalStepIndicator 
          currentStep={currentStep} 
          completedSteps={completedSteps} 
          requestType={request.request_type}
        />

        {/* ── Candidate steps ── */}
        {!isPartner && currentStep === 'detect' && (
          <MergeDetectionStep
            email={request.email}
            name={request.name}
            onSelectMerges={handleMergeSelection}
            onSkip={handleSkipMerge}
          />
        )}

        {!isPartner && currentStep === 'create' && (
          <CreateProfileStep
            request={request}
            adminId={adminId}
            onCreateProfile={handleProfileCreated}
            onSkipProfile={handleSkipProfile}
            onBack={() => setCurrentStep('detect')}
          />
        )}

        {!isPartner && currentStep === 'assign' && (
          <AssignmentTypeStep
            requestType={request.request_type}
            existingApplications={existingApplications}
            onAssign={handleAssignment}
            onBack={() => setCurrentStep(mergeActions.length > 0 ? 'detect' : 'create')}
          />
        )}

        {/* ── Partner steps ── */}
        {isPartner && currentStep === 'company' && (
          <CompanySelectionStep
            companyNameFromRequest={request.title_or_company || request.name}
            industry={partnerAdditionalData?.industry}
            companySize={partnerAdditionalData?.company_size}
            website={partnerAdditionalData?.website}
            location={request.location || undefined}
            onSelect={handleCompanySelected}
          />
        )}

        {/* ── Shared confirm step ── */}
        {currentStep === 'confirm' && (
          <ApprovalConfirmationStep
            summary={buildSummary()}
            sendEmail={sendEmail}
            setSendEmail={setSendEmail}
            sendSMS={sendSMS}
            setSendSMS={setSendSMS}
            onConfirm={handleConfirmApproval}
            onBack={() => setCurrentStep(isPartner ? 'company' : 'assign')}
            isSubmitting={isSubmitting}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
