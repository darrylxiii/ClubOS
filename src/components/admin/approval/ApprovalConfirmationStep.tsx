import { CheckCircle2, Mail, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface ApprovalConfirmationStepProps {
  summary: {
    action: 'merge' | 'create';
    mergeCount?: number;
    profileCreated?: boolean;
    jobAssigned?: boolean;
    jobAssignment?: {
      jobId: string;
      companyId: string;
      stageIndex: number;
    };
  };
  sendEmail: boolean;
  setSendEmail: (value: boolean) => void;
  sendSMS: boolean;
  setSendSMS: (value: boolean) => void;
  onConfirm: () => void;
  onBack: () => void;
  isSubmitting: boolean;
}

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
        <h3 className="text-lg font-semibold">Confirm Approval</h3>
      </div>

      <Alert>
        <AlertDescription>
          Review the actions that will be performed when you approve this member request.
        </AlertDescription>
      </Alert>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div>
            <h4 className="font-semibold mb-3">Actions to be performed:</h4>
            <div className="space-y-2">
              {summary.action === 'merge' && summary.mergeCount && (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <span>Merge with {summary.mergeCount} existing candidate profile{summary.mergeCount > 1 ? 's' : ''}</span>
                  <Badge variant="secondary">Merge</Badge>
                </div>
              )}

              {summary.action === 'create' && summary.profileCreated && (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <span>Create new candidate profile and link to user account</span>
                  <Badge variant="secondary">Create & Link</Badge>
                </div>
              )}

              {summary.action === 'create' && !summary.profileCreated && summary.mergeCount === 0 && (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">No candidate profile will be created</span>
                  <Badge variant="outline">Skip Profile</Badge>
                </div>
              )}

              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>Approve member request and grant access</span>
                <Badge variant="default">Approve</Badge>
              </div>
            </div>

            {/* Show alert when no profile is created */}
            {!summary.profileCreated && summary.mergeCount === 0 && (
              <Alert className="mt-4">
                <AlertDescription>
                  The member will be approved and granted platform access. A candidate profile can be created manually later if needed for talent tracking.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="border-t pt-4 space-y-3">
            <h4 className="font-semibold">Notifications:</h4>
            
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
        <Button variant="outline" onClick={onBack} disabled={isSubmitting}>
          Back
        </Button>
        <Button onClick={onConfirm} disabled={isSubmitting}>
          {isSubmitting ? 'Processing...' : 'Approve Member'}
        </Button>
      </div>
    </div>
  );
};
