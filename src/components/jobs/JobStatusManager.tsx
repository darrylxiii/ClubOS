import { memo, useState } from "react";
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { JobStatusBadge, JobStatus } from "./JobStatusBadge";
import { 
  usePublishJob, 
  useUnpublishJob, 
  useCloseJob, 
  useReopenJob, 
  useArchiveJob, 
  useRestoreJob 
} from "@/hooks/useJobStatus";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  CheckCircle, 
  FileEdit, 
  XCircle, 
  Archive, 
  RefreshCw,
  Loader2,
  ArrowRight
} from "lucide-react";

interface JobStatusManagerProps {
  jobId: string;
  jobTitle: string;
  currentStatus: JobStatus;
  onStatusChange?: () => void;
}

export const JobStatusManager = memo(({ 
  jobId, 
  jobTitle, 
  currentStatus,
  onStatusChange
}: JobStatusManagerProps) => {
  const { t } = useTranslation('jobs');
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: string;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({ open: false, action: "", title: "", description: "", onConfirm: () => {} });

  const publishJob = usePublishJob();
  const unpublishJob = useUnpublishJob();
  const closeJob = useCloseJob();
  const reopenJob = useReopenJob();
  const archiveJob = useArchiveJob();
  const restoreJob = useRestoreJob();

  const isLoading = 
    publishJob.isPending || 
    unpublishJob.isPending || 
    closeJob.isPending || 
    reopenJob.isPending || 
    archiveJob.isPending || 
    restoreJob.isPending;

  const handleAction = (
    action: string,
    title: string,
    description: string,
    mutationFn: () => void
  ) => {
    setConfirmDialog({
      open: true,
      action,
      title,
      description,
      onConfirm: () => {
        mutationFn();
        setConfirmDialog(prev => ({ ...prev, open: false }));
        onStatusChange?.();
      },
    });
  };

  const renderActions = () => {
    switch (currentStatus) {
      case "draft":
        return (
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => handleAction(
                "publish",
                t('statusManager.publishJob', 'Publish Job'),
                t('statusManager.publishDescription', 'This will make "{{title}}" visible to candidates and start accepting applications.', { title: jobTitle }),
                () => publishJob.mutate({ jobId, jobTitle })
              )}
              className="gap-2 bg-success hover:bg-success/90 text-success-foreground"
              disabled={isLoading}
            >
              {publishJob.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              {t('statusManager.publishJob', 'Publish Job')}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleAction(
                "close",
                t('statusManager.closeJob', 'Close Job'),
                t('statusManager.closeWithoutPublishing', 'This will close "{{title}}" without publishing. You can reopen it later.', { title: jobTitle }),
                () => closeJob.mutate({ jobId, jobTitle })
              )}
              className="gap-2"
              disabled={isLoading}
            >
              {closeJob.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
              {t('statusManager.closeJob', 'Close Job')}
            </Button>
          </div>
        );

      case "published":
        return (
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => handleAction(
                "unpublish",
                t('statusManager.unpublishToDraft', 'Unpublish to Draft'),
                t('statusManager.unpublishDescription', 'This will hide "{{title}}" from candidates and move it back to draft.', { title: jobTitle }),
                () => unpublishJob.mutate({ jobId, jobTitle })
              )}
              className="gap-2"
              disabled={isLoading}
            >
              {unpublishJob.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileEdit className="w-4 h-4" />}
              {t('statusManager.unpublishToDraft', 'Unpublish to Draft')}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleAction(
                "close",
                t('statusManager.closeJob', 'Close Job'),
                t('statusManager.closePublishedDescription', 'This will close "{{title}}" and stop accepting new applications.', { title: jobTitle }),
                () => closeJob.mutate({ jobId, jobTitle })
              )}
              className="gap-2 text-warning hover:text-warning"
              disabled={isLoading}
            >
              {closeJob.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
              {t('statusManager.closeJob', 'Close Job')}
            </Button>
          </div>
        );

      case "closed":
        return (
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => handleAction(
                "reopen",
                t('statusManager.reopenJob', 'Reopen Job'),
                t('statusManager.reopenDescription', 'This will reopen "{{title}}" and start accepting applications again.', { title: jobTitle }),
                () => reopenJob.mutate({ jobId, jobTitle })
              )}
              className="gap-2"
              disabled={isLoading}
            >
              {reopenJob.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {t('statusManager.reopenJob', 'Reopen Job')}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleAction(
                "archive",
                t('statusManager.archiveJob', 'Archive Job'),
                t('statusManager.archiveDescription', 'This will archive "{{title}}". Archived jobs are hidden but can be restored.', { title: jobTitle }),
                () => archiveJob.mutate({ jobId, jobTitle })
              )}
              className="gap-2"
              disabled={isLoading}
            >
              {archiveJob.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
              {t('statusManager.archiveJob', 'Archive Job')}
            </Button>
          </div>
        );

      case "archived":
        return (
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => handleAction(
                "restore",
                t('statusManager.restoreJob', 'Restore Job'),
                t('statusManager.restoreDescription', 'This will restore "{{title}}" from archive. It will be moved to "Closed" status.', { title: jobTitle }),
                () => restoreJob.mutate({ jobId, jobTitle })
              )}
              className="gap-2"
              disabled={isLoading}
            >
              {restoreJob.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {t('statusManager.restoreFromArchive', 'Restore from Archive')}
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  // Status flow visualization
  const statusFlow = [
    { status: "draft" as JobStatus, label: t('statusManager.draft', 'Draft') },
    { status: "published" as JobStatus, label: t('statusManager.active', 'Active') },
    { status: "closed" as JobStatus, label: t('statusManager.closed', 'Closed') },
    { status: "archived" as JobStatus, label: t('statusManager.archived', 'Archived') },
  ];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t('statusManager.title', 'Job Status')}</CardTitle>
          <CardDescription>
            {t('statusManager.description', 'Manage the lifecycle of this job posting')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Status Display */}
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{t('statusManager.currentStatus', 'Current Status:')}</span>
            <JobStatusBadge status={currentStatus} size="lg" />
          </div>

          {/* Status Flow Visualization */}
          <div className="p-4 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground mb-3">{t('statusManager.jobLifecycle', 'Job Lifecycle')}</p>
            <div className="flex items-center gap-2 flex-wrap">
              {statusFlow.map((item, index) => (
                <div key={item.status} className="flex items-center gap-2">
                  <div className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    currentStatus === item.status
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-muted border-border text-muted-foreground"
                  }`}>
                    {item.label}
                  </div>
                  {index < statusFlow.length - 1 && (
                    <ArrowRight className="w-3 h-3 text-muted-foreground/50" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <p className="text-sm font-medium">{t('statusManager.availableActions', 'Available Actions')}</p>
            {renderActions()}
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common:cancel', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDialog.onConfirm}>
              {t('common:confirm', 'Confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
});

JobStatusManager.displayName = "JobStatusManager";
