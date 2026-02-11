import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { candidateAuditService, DeletionImpact } from "@/services/candidateAuditService";
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
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Archive, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface DeleteCandidateDialogProps {
  candidate: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
  deleteType: 'soft' | 'hard';
}

export function DeleteCandidateDialog({
  candidate,
  open,
  onOpenChange,
  onDeleted,
  deleteType
}: DeleteCandidateDialogProps) {
  const [reason, setReason] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [impact, setImpact] = useState<DeletionImpact | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingImpact, setLoadingImpact] = useState(true);

  useEffect(() => {
    if (open && candidate) {
      loadDeletionImpact();
    }
  }, [open, candidate]);

  const loadDeletionImpact = async () => {
    setLoadingImpact(true);
    const { data } = await candidateAuditService.getDeletionImpact(candidate.id);
    setImpact(data);
    setLoadingImpact(false);
  };

  const handleSoftDelete = async () => {
    if (!reason.trim()) {
      toast.error('Please provide a reason for archiving');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get before state
      const { data: before } = await supabase
        .from('candidate_profiles')
        .select('*')
        .eq('id', candidate.id)
        .single();

      // Soft delete - mark as deleted
      const { error } = await supabase
        .from('candidate_profiles')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: user.id,
          deletion_reason: reason,
          deletion_type: 'soft',
          deletion_metadata: {
            applications_preserved: impact?.total_applications || 0
          }
        } as any)
        .eq('id', candidate.id);

      if (error) throw error;

      // Log audit entry
      await candidateAuditService.logAudit({
        candidate_id: candidate.id,
        action: 'soft_delete',
        before_data: before,
        reason: reason,
        metadata: {
          type: 'soft',
          applications_preserved: impact?.total_applications || 0
        }
      });

      toast.success('Candidate archived successfully. Stats preserved.');
      onDeleted();
      onOpenChange(false);
      setReason('');
    } catch (error: unknown) {
      console.error('Error archiving candidate:', error);
      toast.error('Failed to archive candidate: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleHardDelete = async () => {
    if (!reason.trim()) {
      toast.error('Please provide a reason for deletion');
      return;
    }

    if (confirmText !== 'DELETE') {
      toast.error('Please type DELETE to confirm permanent deletion');
      return;
    }

    setLoading(true);
    try {
      // Log audit BEFORE deletion (since candidate will be gone)
      await candidateAuditService.logAudit({
        candidate_id: candidate.id,
        action: 'hard_delete',
        before_data: candidate,
        reason: reason,
        metadata: {
          type: 'hard',
          permanent: true,
          applications_to_orphan: impact?.total_applications || 0
        }
      });

      // Hard delete - permanent removal
      const { error } = await supabase
        .from('candidate_profiles')
        .delete()
        .eq('id', candidate.id);

      if (error) throw error;

      toast.success('Candidate permanently deleted. Stats updated.');
      onDeleted();
      onOpenChange(false);
      setReason('');
      setConfirmText('');
    } catch (error: unknown) {
      console.error('Error deleting candidate:', error);
      toast.error('Failed to delete candidate: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const isSoftDelete = deleteType === 'soft';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isSoftDelete ? (
              <>
                <Archive className="h-5 w-5 text-accent" />
                Archive Candidate
              </>
            ) : (
              <>
                <Trash2 className="h-5 w-5 text-destructive" />
                Permanently Delete Candidate
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isSoftDelete ? (
              <>This candidate will be archived and hidden from active searches.</>
            ) : (
              <>⚠️ THIS ACTION CANNOT BE UNDONE. The candidate will be permanently removed.</>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Impact Preview */}
          {loadingImpact ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : impact && (
            <Alert variant={isSoftDelete ? "default" : "destructive"}>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>
                {isSoftDelete ? '✅ Stats Preserved' : '❌ Stats Impact'}
              </AlertTitle>
              <AlertDescription>
                <ul className="mt-2 space-y-1 text-sm">
                  <li>• {impact.total_applications} total applications {isSoftDelete ? 'will remain linked' : 'will be orphaned'}</li>
                  <li>• {impact.rejected_applications} rejected applications {isSoftDelete ? 'counted in stats' : 'removed from metrics'}</li>
                  <li>• {impact.active_applications} active applications {isSoftDelete ? 'preserved' : 'will be withdrawn'}</li>
                  <li>• {impact.hired_applications} hired applications {isSoftDelete ? 'preserved' : 'removed'}</li>
                  {impact.affected_jobs.length > 0 && (
                    <li className="mt-2">
                      • Affects jobs: {impact.affected_jobs.map((job, i) => (
                        <Badge key={i} variant="outline" className="ml-1">
                          {job}
                        </Badge>
                      ))}
                    </li>
                  )}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Reason Input */}
          <div className="space-y-2">
            <Label htmlFor="reason">
              Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder={isSoftDelete ? "e.g., Duplicate profile, inactive candidate..." : "e.g., Test account, data entry error..."}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          {/* Hard Delete Confirmation */}
          {!isSoftDelete && (
            <div className="space-y-2">
              <Label htmlFor="confirm">
                Type <span className="font-mono font-bold">DELETE</span> to confirm
              </Label>
              <Input
                id="confirm"
                placeholder="DELETE"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="font-mono"
              />
            </div>
          )}

          {!isSoftDelete && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This will permanently remove the candidate from your database and all historical metrics.
                {isSoftDelete ? ' Consider archiving instead if you want to preserve stats.' : ''}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setReason('');
              setConfirmText('');
            }}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant={isSoftDelete ? "secondary" : "default"}
            className={!isSoftDelete ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            onClick={isSoftDelete ? handleSoftDelete : handleHardDelete}
            disabled={loading || !reason.trim() || (!isSoftDelete && confirmText !== 'DELETE')}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : isSoftDelete ? (
              <>
                <Archive className="mr-2 h-4 w-4" />
                Archive Candidate
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Forever
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
