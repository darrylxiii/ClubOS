import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, CheckCircle2, Link2, Loader2 } from "lucide-react";
import { mergeService } from "@/services/mergeService";
import { toast } from "sonner";

interface MergePreviewDialogProps {
  candidateId: string;
  userId: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function MergePreviewDialog({ candidateId, userId, open, onClose, onSuccess }: MergePreviewDialogProps) {
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);

  useEffect(() => {
    if (open) {
      loadPreview();
    }
  }, [open, candidateId, userId]);

  const loadPreview = async () => {
    setLoading(true);
    console.log('[MergePreviewDialog] Loading preview for:', { candidateId, userId });
    try {
      const previewData = await mergeService.previewMerge(candidateId, userId);
      console.log('[MergePreviewDialog] Preview loaded:', previewData);
      
      if (!previewData) {
        throw new Error('Preview returned null - check service logs for details');
      }
      
      setPreview(previewData);
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to load merge preview';
      console.error('[MergePreviewDialog] Preview error:', {
        message: errorMessage,
        candidateId,
        userId,
        error,
        timestamp: new Date().toISOString()
      });
      
      toast.error(errorMessage);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const executeMerge = async () => {
    setExecuting(true);
    console.log('[MergePreviewDialog] Executing merge:', { candidateId, userId });
    try {
      const result = await mergeService.executeMerge(candidateId, userId, 'manual');
      console.log('[MergePreviewDialog] Merge result:', result);
      
      if (result.success) {
        toast.success('Profiles merged successfully!');
        onSuccess();
      } else {
        throw new Error(result.error || 'Merge failed');
      }
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to execute merge';
      console.error('[MergePreviewDialog] Execute error:', {
        message: errorMessage,
        candidateId,
        userId,
        error,
        timestamp: new Date().toISOString()
      });
      
      toast.error(errorMessage);
    } finally {
      setExecuting(false);
    }
  };

  const renderFieldComparison = (field: any) => {
    const { name, candidateValue, userValue, willMerge, conflict } = field;
    
    let badgeVariant: "default" | "secondary" | "destructive" = "secondary";
    let icon = null;
    
    if (willMerge && !conflict) {
      badgeVariant = "default";
      icon = <CheckCircle2 className="w-3 h-3" />;
    } else if (conflict) {
      badgeVariant = "destructive";
      icon = <AlertCircle className="w-3 h-3" />;
    }

    return (
      <div key={name} className="flex items-start gap-3 py-2">
        <Badge variant={badgeVariant} className="flex items-center gap-1 shrink-0">
          {icon}
          {willMerge && !conflict ? "Will merge" : conflict ? "Conflict" : "No change"}
        </Badge>
        <div className="flex-1 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">{name} (Candidate)</p>
            <p className="text-sm font-medium">{candidateValue || <span className="text-muted-foreground italic">Empty</span>}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">{name} (User)</p>
            <p className="text-sm font-medium">{userValue || <span className="text-muted-foreground italic">Empty</span>}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            Merge Preview
          </DialogTitle>
          <DialogDescription>
            Review the changes before merging these profiles
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : preview ? (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{preview.candidate.full_name}</p>
                    <p className="text-sm text-muted-foreground">{preview.candidate.email}</p>
                    <Badge variant="outline" className="mt-2">Candidate</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="flex items-center justify-center">
                <CardContent className="pt-4">
                  <div className="text-center">
                    <Link2 className="w-8 h-8 mx-auto mb-2 text-primary" />
                    <p className="text-sm font-medium">Will be linked to</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{preview.user.full_name}</p>
                    <p className="text-sm text-muted-foreground">{preview.user.email}</p>
                    <Badge variant="outline" className="mt-2">User</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Statistics */}
            <Card>
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Applications</p>
                    <p className="text-2xl font-bold">{preview.applicationCount || 0}</p>
                    <p className="text-xs text-muted-foreground">Will be transferred</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Interactions</p>
                    <p className="text-2xl font-bold">{preview.interactionCount || 0}</p>
                    <p className="text-xs text-muted-foreground">Will be preserved</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Separator />

            {/* Field Comparison */}
            <div>
              <h3 className="font-semibold mb-4">Field Comparison</h3>
              <div className="space-y-1">
                {preview.fieldsToMerge?.map((field: any) => renderFieldComparison(field))}
              </div>
            </div>

            {preview.conflicts && preview.conflicts.length > 0 && (
              <Card className="border-yellow-500/50 bg-yellow-500/10">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-600">Conflicts Detected</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {preview.conflicts.length} field(s) have different values. The user's values will be preserved unless they are empty.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Failed to load preview</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={executing}>
            Cancel
          </Button>
          <Button onClick={executeMerge} disabled={loading || executing}>
            {executing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Merging...
              </>
            ) : (
              <>
                <Link2 className="w-4 h-4 mr-2" />
                Execute Merge
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
