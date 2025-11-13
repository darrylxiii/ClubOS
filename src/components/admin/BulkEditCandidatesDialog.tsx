import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { candidateAuditService } from "@/services/candidateAuditService";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface BulkEditCandidatesDialogProps {
  candidateIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

const EDITABLE_FIELDS = [
  { value: 'notice_period', label: 'Notice Period', type: 'text' },
  { value: 'remote_preference', label: 'Remote Preference', type: 'select', options: ['remote', 'hybrid', 'onsite'] },
  { value: 'preferred_currency', label: 'Currency', type: 'select', options: ['EUR', 'USD', 'GBP'] },
  { value: 'internal_rating', label: 'Internal Rating', type: 'number' },
];

export function BulkEditCandidatesDialog({
  candidateIds,
  open,
  onOpenChange,
  onComplete
}: BulkEditCandidatesDialogProps) {
  const [selectedField, setSelectedField] = useState<string>('');
  const [newValue, setNewValue] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const selectedFieldConfig = EDITABLE_FIELDS.find(f => f.value === selectedField);

  const handleBulkEdit = async () => {
    if (!selectedField || !newValue || !reason) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    const bulkActionId = crypto.randomUUID();
    let successCount = 0;
    let errorCount = 0;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      for (const candidateId of candidateIds) {
        try {
          // Get before state
          const { data: before } = await supabase
            .from('candidate_profiles')
            .select('*')
            .eq('id', candidateId)
            .single();

          if (!before) {
            errorCount++;
            continue;
          }

          // Parse value based on field type
          let parsedValue: any = newValue;
          if (selectedFieldConfig?.type === 'number') {
            parsedValue = parseInt(newValue);
          }

          // Update candidate
          const { error: updateError } = await supabase
            .from('candidate_profiles')
            .update({ [selectedField]: parsedValue })
            .eq('id', candidateId);

          if (updateError) {
            console.error(`Error updating candidate ${candidateId}:`, updateError);
            errorCount++;
            continue;
          }

          // Log audit entry
          await candidateAuditService.logAudit({
            candidate_id: candidateId,
            action: 'update',
            before_data: before,
            after_data: { ...before, [selectedField]: parsedValue },
            changed_fields: [selectedField],
            reason: reason,
            is_bulk_action: true,
            bulk_action_id: bulkActionId,
            metadata: {
              bulk_edit: true,
              total_in_batch: candidateIds.length
            }
          });

          successCount++;
        } catch (error) {
          console.error(`Error processing candidate ${candidateId}:`, error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Updated ${successCount} candidate${successCount !== 1 ? 's' : ''}`);
      }
      if (errorCount > 0) {
        toast.error(`Failed to update ${errorCount} candidate${errorCount !== 1 ? 's' : ''}`);
      }

      onComplete();
      onOpenChange(false);
      setSelectedField('');
      setNewValue('');
      setReason('');
    } catch (error: any) {
      console.error('Bulk edit error:', error);
      toast.error('Bulk edit failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Edit {candidateIds.length} Candidates</DialogTitle>
          <DialogDescription>
            Update a single field for all selected candidates at once.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Field Selection */}
          <div className="space-y-2">
            <Label htmlFor="field">Field to Edit</Label>
            <Select value={selectedField} onValueChange={(value) => {
              setSelectedField(value);
              setNewValue('');
            }}>
              <SelectTrigger id="field">
                <SelectValue placeholder="Select a field to edit" />
              </SelectTrigger>
              <SelectContent>
                {EDITABLE_FIELDS.map((field) => (
                  <SelectItem key={field.value} value={field.value}>
                    {field.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Value Input */}
          {selectedField && (
            <div className="space-y-2">
              <Label htmlFor="value">New Value</Label>
              {selectedFieldConfig?.type === 'select' && selectedFieldConfig.options ? (
                <Select value={newValue} onValueChange={setNewValue}>
                  <SelectTrigger id="value">
                    <SelectValue placeholder="Select a value" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedFieldConfig.options.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : selectedFieldConfig?.type === 'number' ? (
                <Input
                  id="value"
                  type="number"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder="Enter a number"
                />
              ) : (
                <Input
                  id="value"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder="Enter new value"
                />
              )}
            </div>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Bulk Edit</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Standardizing notice periods across all candidates"
              rows={3}
            />
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Bulk Action</AlertTitle>
            <AlertDescription>
              This will update {candidateIds.length} candidates. All changes will be logged in the audit trail.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setSelectedField('');
              setNewValue('');
              setReason('');
            }}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleBulkEdit}
            disabled={loading || !selectedField || !newValue || !reason}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              <>Apply to {candidateIds.length} Candidates</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
