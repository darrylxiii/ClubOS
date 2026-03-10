import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAggregatedReviewQueue, type ReviewJobSummary } from '@/hooks/useAggregatedReviewQueue';
import { InternalReviewPanel } from './InternalReviewPanel';
import { PartnerFirstReviewPanel } from './PartnerFirstReviewPanel';
import { cn } from '@/lib/utils';
import { Briefcase, CheckCircle2, ShieldCheck, ClipboardCheck } from 'lucide-react';

interface ReviewHubDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialJobId?: string | null;
  mode: 'internal' | 'partner';
}

export const ReviewHubDialog = ({
  open,
  onOpenChange,
  initialJobId,
  mode,
}: ReviewHubDialogProps) => {
  const { jobs, totalPending } = useAggregatedReviewQueue();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(initialJobId ?? null);

  // When dialog opens with initialJobId, sync it
  useEffect(() => {
    if (open && initialJobId) {
      setSelectedJobId(initialJobId);
    } else if (open && !initialJobId && jobs.length > 0) {
      setSelectedJobId(jobs[0].jobId);
    }
  }, [open, initialJobId, jobs]);

  // Auto-advance when current job queue empties
  useEffect(() => {
    if (!open) return;
    const currentJob = jobs.find((j) => j.jobId === selectedJobId);
    if (currentJob && currentJob.pendingCount === 0) {
      const nextJob = jobs.find((j) => j.pendingCount > 0 && j.jobId !== selectedJobId);
      if (nextJob) {
        setSelectedJobId(nextJob.jobId);
      }
    }
  }, [jobs, selectedJobId, open]);

  const ModeIcon = mode === 'internal' ? ShieldCheck : ClipboardCheck;
  const modeLabel = mode === 'internal' ? 'Internal Review Triage' : 'Partner Candidate Review';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-7xl !w-[95vw] h-[90vh] p-0 gap-0 flex flex-col">
        {/* Header */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/15 text-primary">
              <ModeIcon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-lg">{modeLabel}</DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                {totalPending > 0
                  ? `${totalPending} candidate${totalPending > 1 ? 's' : ''} pending across ${jobs.length} role${jobs.length > 1 ? 's' : ''}`
                  : 'All reviews are complete'}
              </DialogDescription>
            </div>
            {totalPending > 0 && (
              <Badge className="bg-primary/20 text-primary border-primary/30">
                {totalPending} pending
              </Badge>
            )}
          </div>
        </DialogHeader>

        {/* Body: sidebar + main */}
        <div className="flex flex-1 min-h-0">
          {/* Left sidebar — job list */}
          <div className="w-64 shrink-0 border-r border-border/20 bg-card/20">
            <ScrollArea className="h-full">
              <div className="p-3 space-y-1">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground px-2 mb-2">
                  Roles
                </p>
                {jobs.length === 0 && (
                  <div className="flex flex-col items-center py-8 text-muted-foreground gap-2">
                    <CheckCircle2 className="h-8 w-8 text-success/50" />
                    <span className="text-xs">No pending reviews</span>
                  </div>
                )}
                {jobs.map((job) => (
                  <JobSidebarItem
                    key={job.jobId}
                    job={job}
                    isSelected={selectedJobId === job.jobId}
                    onClick={() => setSelectedJobId(job.jobId)}
                  />
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Right panel — review content */}
          <div className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6">
            {selectedJobId ? (
              mode === 'internal' ? (
                <InternalReviewPanel jobId={selectedJobId} />
              ) : (
                <PartnerFirstReviewPanel jobId={selectedJobId} />
              )
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
                <Briefcase className="h-10 w-10 opacity-30" />
                <p className="text-sm">Select a role to begin reviewing</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

function JobSidebarItem({
  job,
  isSelected,
  onClick,
}: {
  job: ReviewJobSummary;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-lg px-3 py-2.5 transition-all duration-200',
        isSelected
          ? 'bg-primary/15 border border-primary/30'
          : 'hover:bg-card/40 border border-transparent',
      )}
    >
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className={cn('text-sm truncate', isSelected ? 'font-semibold' : 'font-medium')}>
            {job.jobTitle}
          </p>
          <p className="text-[10px] text-muted-foreground truncate">{job.companyName}</p>
        </div>
        <Badge
          className={cn(
            'text-[10px] ml-2 shrink-0 min-w-[20px] justify-center',
            job.pendingCount === 0
              ? 'bg-success/20 text-success border-success/30'
              : job.isOverdue
                ? 'bg-destructive/20 text-destructive border-destructive/30'
                : 'bg-warning/20 text-warning border-warning/30',
          )}
        >
          {job.pendingCount}
        </Badge>
      </div>
    </button>
  );
}
