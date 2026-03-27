import { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, ArrowRightLeft, XCircle, CheckSquare, Mail, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { BulkStageMoveDialog } from './BulkStageMoveDialog';
import { ConfirmActionDialog } from '@/components/ui/ConfirmActionDialog';

interface PipelineStage {
  order: number;
  name: string;
  [key: string]: unknown;
}

interface CandidateBulkActionBarProps {
  selectedCount: number;
  selectedIds: Set<string>;
  stages: PipelineStage[];
  jobId: string;
  onClearSelection: () => void;
  onBulkMove?: (applicationIds: string[], toStage: number) => Promise<void>;
  onBulkReject?: (applicationIds: string[], reason?: string) => Promise<void>;
  onBulkEmail?: (applicationIds: string[]) => void;
  onCompare?: (applicationIds: string[]) => void;
  onActionComplete: () => void;
  className?: string;
}

export const CandidateBulkActionBar = memo(({
  selectedCount,
  selectedIds,
  stages,
  jobId,
  onClearSelection,
  onBulkMove,
  onBulkReject,
  onBulkEmail,
  onCompare,
  onActionComplete,
  className,
}: CandidateBulkActionBarProps) => {
  const { t } = useTranslation('jobDashboard');
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  if (selectedCount === 0) return null;

  const ids = Array.from(selectedIds);

  const handleBulkReject = async (reason?: string) => {
    if (!onBulkReject) return;
    setIsProcessing(true);
    try {
      await onBulkReject(ids, reason);
      onActionComplete();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkMove = async (toStage: number) => {
    if (!onBulkMove) return;
    setIsProcessing(true);
    try {
      await onBulkMove(ids, toStage);
      onActionComplete();
    } finally {
      setIsProcessing(false);
      setShowMoveDialog(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className={cn(
            'fixed bottom-6 left-1/2 -translate-x-1/2 z-50',
            'flex items-center gap-3 px-4 py-3',
            'bg-card/95 backdrop-blur-[var(--blur-glass)] border border-border/40 rounded-xl shadow-glass-xl',
            className
          )}
        >
          {/* Selection count */}
          <div className="flex items-center gap-2 pr-3 border-r border-border/40">
            <CheckSquare className="w-4 h-4 text-primary" />
            <Badge variant="secondary" className="font-bold">
              {t('bulk.selected', '{{count}} selected', { count: selectedCount })}
            </Badge>
          </div>

          {/* Quick actions */}
          <div className="flex items-center gap-2">
            {onBulkMove && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setShowMoveDialog(true)}
                disabled={isProcessing}
              >
                <ArrowRightLeft className="w-4 h-4 text-primary" />
                <span className="hidden sm:inline">{t('bulk.moveToStage', 'Move to Stage')}</span>
              </Button>
            )}

            {onBulkEmail && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => onBulkEmail(ids)}
                disabled={isProcessing}
              >
                <Mail className="w-4 h-4 text-primary" />
                <span className="hidden sm:inline">{t('bulk.email', 'Email')}</span>
              </Button>
            )}

            {onCompare && selectedCount >= 2 && selectedCount <= 5 && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => onCompare(ids)}
                disabled={isProcessing}
              >
                <Users className="w-4 h-4 text-primary" />
                <span className="hidden sm:inline">{t('bulk.compare', 'Compare')}</span>
              </Button>
            )}

            {onBulkReject && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setShowRejectConfirm(true)}
                disabled={isProcessing}
              >
                <XCircle className="w-4 h-4 text-destructive" />
                <span className="hidden sm:inline">{t('bulk.reject', 'Reject')}</span>
              </Button>
            )}
          </div>

          {/* Clear selection */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 ml-2"
            onClick={onClearSelection}
            aria-label={t('bulk.clearSelection', 'Clear selection')}
          >
            <X className="w-4 h-4" />
          </Button>
        </motion.div>
      </AnimatePresence>

      <BulkStageMoveDialog
        open={showMoveDialog}
        onOpenChange={setShowMoveDialog}
        stages={stages}
        selectedCount={selectedCount}
        onConfirm={handleBulkMove}
        isProcessing={isProcessing}
      />

      <ConfirmActionDialog
        open={showRejectConfirm}
        onOpenChange={setShowRejectConfirm}
        type="destructive"
        title={t('bulk.rejectTitle', 'Reject Candidates')}
        description={t('bulk.rejectDesc', "Are you sure you want to reject {{count}} candidate(s)? This action will move them out of the pipeline.", { count: selectedCount })}
        confirmText={t('bulk.rejectConfirm', 'Reject All')}
        requireReason
        reasonLabel={t('bulk.rejectionReason', 'Rejection reason')}
        reasonPlaceholder={t('bulk.rejectionPlaceholder', 'Enter reason for rejection...')}
        onConfirm={handleBulkReject}
        isLoading={isProcessing}
      />
    </>
  );
});

CandidateBulkActionBar.displayName = 'CandidateBulkActionBar';
