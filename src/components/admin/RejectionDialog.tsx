import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { Loader2, XCircle, Mail } from "lucide-react";

interface RejectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateName: string;
  onConfirm: (reason: string, sendEmail: boolean) => Promise<void>;
}

const REJECTION_REASONS = [
  { value: "not_qualified", label: "Not qualified for current opportunities" },
  { value: "position_filled", label: "All positions filled" },
  { value: "location_mismatch", label: "Location requirements don't match" },
  { value: "salary_mismatch", label: "Salary expectations don't align" },
  { value: "incomplete_profile", label: "Incomplete application" },
  { value: "custom", label: "Custom reason (specify below)" }
];

export function RejectionDialog({ 
  open, 
  onOpenChange, 
  candidateName,
  onConfirm 
}: RejectionDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [reasonTemplate, setReasonTemplate] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [sendEmail, setSendEmail] = useState(false);

  const handleConfirm = async () => {
    const finalReason = reasonTemplate === "custom" 
      ? customReason 
      : REJECTION_REASONS.find(r => r.value === reasonTemplate)?.label || "";

    if (!finalReason.trim()) {
      return;
    }

    setIsLoading(true);
    try {
      await onConfirm(finalReason, sendEmail);
      onOpenChange(false);
      // Reset form
      setReasonTemplate("");
      setCustomReason("");
      setSendEmail(false);
    } catch (error) {
      console.error('Rejection failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30">
              <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <DialogTitle>Reject Application</DialogTitle>
          </div>
          <DialogDescription>
            You're about to reject <span className="font-semibold text-foreground">{candidateName}</span>'s application.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for rejection *</Label>
            <Select value={reasonTemplate} onValueChange={setReasonTemplate}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {REJECTION_REASONS.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {reasonTemplate === "custom" && (
            <div className="space-y-2">
              <Label htmlFor="custom-reason">Custom reason *</Label>
              <Textarea
                id="custom-reason"
                placeholder="Explain why this application is being rejected..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                rows={4}
              />
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Checkbox
              id="send-rejection-email"
              checked={sendEmail}
              onCheckedChange={(checked) => setSendEmail(checked as boolean)}
            />
            <Label 
              htmlFor="send-rejection-email" 
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Send rejection notification email
              </div>
            </Label>
          </div>

          <div className="bg-muted/50 p-3 rounded-lg">
            <p className="text-xs text-muted-foreground">
              Note: This action will mark the application as rejected and log the reason internally. 
              The candidate data will be retained for record-keeping.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || !reasonTemplate || (reasonTemplate === "custom" && !customReason.trim())}
            variant="outline"
            className="border-red-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Rejecting...
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 mr-2" />
                Reject Application
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
