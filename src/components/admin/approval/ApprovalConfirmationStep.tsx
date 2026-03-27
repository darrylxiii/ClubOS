import { CheckCircle2, Mail, MessageSquare, UserPlus, Briefcase, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AssignmentType, StaffAssignment, PipelineAssignment, CompanyAssignmentData } from "@/types/approval";
import { useTranslation } from 'react-i18next';

interface ApprovalConfirmationStepProps {
  summary: {
    action: 'merge' | 'create' | 'assign_company' | 'create_company';
    mergeCount?: number;
    profileCreated?: boolean;
    assignmentType?: AssignmentType;
    staffAssignment?: StaffAssignment;
    pipelineAssignment?: PipelineAssignment;
    companyAssignment?: CompanyAssignmentData;
  };
  sendEmail: boolean;
  setSendEmail: (value: boolean) => void;
  sendSMS: boolean;
  setSendSMS: (value: boolean) => void;
  onConfirm: () => void;
  onBack: () => void;
  isSubmitting: boolean;
}

const getRoleLabel = (role: string): string => {
  const labels: Record<string, string> = {
    admin: 'Admin',
    strategist: 'Strategist',
    partner: 'Partner',
    recruiter: 'Recruiter',
    hiring_manager: 'Hiring Manager',
    user: 'User',
  };
  return labels[role] || role;
};

export const ApprovalConfirmationStep = ({
  summary,
  sendEmail,
  setSendEmail,
  sendSMS,
  setSendSMS,
  onConfirm,
  onBack,
  isSubmitting,
}: ApprovalConfirmationStepProps) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <CheckCircle2 className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">{t('approval.approvalConfirmationStep.confirmApproval')}</h3>
      </div>

      <Alert>
        <AlertDescription>{t('approval.approvalconfirmationstep.reviewTheActionsThatWillBe', 'Review the actions that will be performed when you approve this member request.')}</AlertDescription>
      </Alert>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div>
            <h4 className="font-semibold mb-3">{t('approval.approvalconfirmationstep.actionsToBePerformed', 'Actions to be performed:')}</h4>
            <div className="space-y-3">
              {/* Merge action */}
              {summary.action === 'merge' && summary.mergeCount && summary.mergeCount > 0 && (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <span>Merge with {summary.mergeCount} existing candidate profile{summary.mergeCount > 1 ? 's' : ''}</span>
                  <Badge variant="secondary">{t('approval.approvalconfirmationstep.merge', 'Merge')}</Badge>
                </div>
              )}

              {/* Profile creation */}
              {summary.action === 'create' && summary.profileCreated && (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <span>{t('approval.approvalConfirmationStep.createNewCandidateProfileAndLink')}</span>
                  <Badge variant="secondary">{t('approval.approvalconfirmationstep.createLink', 'Create & Link')}</Badge>
                </div>
              )}

              {/* Staff/Role assignment */}
              {summary.assignmentType === 'staff' && summary.staffAssignment && (
                <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                  <UserPlus className="w-4 h-4 text-primary mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Assign as {getRoleLabel(summary.staffAssignment.role)}</span>
                      <Badge variant="default">{t('approval.approvalconfirmationstep.staffRole', 'Staff Role')}</Badge>
                    </div>
                    {summary.staffAssignment.companyId && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                        <Building2 className="w-3 h-3" />
                        <span>{t('approval.approvalConfirmationStep.willBeAddedToCompanyAs')}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Pipeline/Candidate assignment */}
              {summary.assignmentType === 'candidate' && summary.pipelineAssignment && (
                <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                  <Briefcase className="w-4 h-4 text-primary mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{t('approval.approvalConfirmationStep.addToJobPipeline')}</span>
                      <Badge variant="default">{t('approval.approvalconfirmationstep.candidate', 'Candidate')}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {summary.pipelineAssignment.stageName && (
                        <span>{t('approval.approvalconfirmationstep.startingAt', 'Starting at:')} <strong>{summary.pipelineAssignment.stageName}</strong> stage</span>
                      )}
                    </div>
                    {!summary.profileCreated && (
                      <div className="text-sm text-muted-foreground mt-1">
                        <span className="text-primary">• Candidate profile will be auto-created</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Partner company assignment */}
              {(summary.action === 'assign_company' || summary.action === 'create_company') && summary.companyAssignment && (
                <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                  <Building2 className="w-4 h-4 text-primary mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {summary.action === 'create_company' ? t('approval.approvalconfirmationstep.createCompany', 'Create company') : t('approval.approvalconfirmationstep.assignToCompany', 'Assign to company')}: {summary.companyAssignment.companyName}
                      </span>
                      <Badge variant="default">{summary.action === 'create_company' ? t('approval.approvalconfirmationstep.new', 'New') : t('approval.approvalconfirmationstep.existing', 'Existing')}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Role: <strong>{summary.companyAssignment.companyRole}</strong>
                      {summary.companyAssignment.industry && ` · ${summary.companyAssignment.industry}`}
                    </div>
                  </div>
                </div>
              )}

              {/* Skip assignment info */}
              {!summary.companyAssignment && summary.assignmentType === 'skip' && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{t('approval.approvalConfirmationStep.noRoleOrPipelineAssignment')}</span>
                  <Badge variant="outline">{t('approval.approvalconfirmationstep.skip', 'Skip')}</Badge>
                </div>
              )}

              {/* Approve action */}
              <div className="flex items-center gap-2 pt-2 border-t">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>{t('approval.approvalConfirmationStep.approveMemberRequestAndGrantPlatform')}</span>
                <Badge variant="default">{t('approval.approvalconfirmationstep.approve', 'Approve')}</Badge>
              </div>
            </div>

            {/* Show alert when no profile or assignment */}
            {!summary.profileCreated && summary.mergeCount === 0 && summary.assignmentType === 'skip' && (
              <Alert className="mt-4">
                <AlertDescription>
                  The member will be approved and granted platform access. A candidate profile or role can be assigned manually later if needed.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="border-t pt-4 space-y-3">
            <h4 className="font-semibold">{t('approval.approvalconfirmationstep.notifications', 'Notifications:')}</h4>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="send_email"
                checked={sendEmail}
                onCheckedChange={(checked) => setSendEmail(checked as boolean)}
              />
              <Label htmlFor="send_email" className="flex items-center gap-2 cursor-pointer">
                <Mail className="w-4 h-4" />
                Send welcome email with access details
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="send_sms"
                checked={sendSMS}
                onCheckedChange={(checked) => setSendSMS(checked as boolean)}
              />
              <Label htmlFor="send_sms" className="flex items-center gap-2 cursor-pointer">
                <MessageSquare className="w-4 h-4" />
                Send SMS notification
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between pt-4">
        <Button variant="outline" onClick={onBack} disabled={isSubmitting}>{t('approval.approvalconfirmationstep.back', 'Back')}</Button>
        <Button onClick={onConfirm} disabled={isSubmitting}>
          {isSubmitting ? t('approval.approvalconfirmationstep.processing', 'Processing...') : t('approval.approvalconfirmationstep.approveMember', 'Approve Member')}
        </Button>
      </div>
    </div>
  );
};
