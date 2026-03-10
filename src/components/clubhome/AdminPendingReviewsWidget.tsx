import { useMemo, useState } from 'react';
import { ShieldCheck, AlertTriangle, ChevronRight, Eye, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAggregatedReviewQueue, type ReviewJobSummary } from '@/hooks/useAggregatedReviewQueue';
import { ReviewHubDialog } from '@/components/partner/ReviewHubDialog';
import { cn } from '@/lib/utils';

function formatSlaCountdown(oldestAt: string | null, slaHours: number): string | null {
  if (!oldestAt) return null;
  const deadlineMs = new Date(oldestAt).getTime() + slaHours * 60 * 60 * 1000;
  const remainingMs = deadlineMs - Date.now();
  if (remainingMs <= 0) return 'Overdue';
  const hours = Math.floor(remainingMs / (60 * 60 * 1000));
  const minutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export const AdminPendingReviewsWidget = () => {
  const { jobs, totalPending, overdueCount, isLoading } = useAggregatedReviewQueue();
  const [hubOpen, setHubOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const handleOpenJob = (jobId: string) => {
    setSelectedJobId(jobId);
    setHubOpen(true);
  };

  const handleOpenAll = () => {
    setSelectedJobId(null);
    setHubOpen(true);
  };

  if (isLoading) {
    return (
      <Card variant="static" className="animate-pulse">
        <CardHeader className="pb-3">
          <div className="h-5 w-48 bg-muted/30 rounded" />
        </CardHeader>
        <CardContent>
          <div className="h-16 bg-muted/20 rounded" />
        </CardContent>
      </Card>
    );
  }

  if (totalPending === 0 && !isLoading) {
    return null;
  }

  return (
    <>
      <Card variant="elevated" className="relative overflow-hidden">
        {overdueCount > 0 && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-destructive via-destructive/60 to-transparent" />
        )}

        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="relative p-2 rounded-xl bg-primary/15 text-primary">
                <ShieldCheck className="h-4 w-4" />
                {/* Unread pulse */}
                <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-destructive animate-pulse" />
              </div>
              <div>
                <CardTitle className="text-base">Internal Review Queue</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {totalPending} candidate{totalPending !== 1 ? 's' : ''} awaiting pre-vet across {jobs.length} role{jobs.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {overdueCount > 0 && (
                <Badge variant="destructive" className="bg-destructive/20 text-destructive border-destructive/30 text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {overdueCount} overdue
                </Badge>
              )}
              <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">
                {totalPending}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-2">
          {jobs.slice(0, 4).map((job) => {
            const sla = formatSlaCountdown(job.oldestPendingAt, 24);
            return (
              <button
                key={job.jobId}
                onClick={() => handleOpenJob(job.jobId)}
                className={cn(
                  'w-full flex items-center justify-between rounded-xl px-3 py-2.5 transition-all duration-200',
                  'hover:bg-card/60 border border-transparent',
                  job.isOverdue
                    ? 'bg-destructive/5 border-destructive/20 hover:bg-destructive/10'
                    : 'hover:border-border/30',
                )}
              >
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium truncate">{job.jobTitle}</p>
                  <p className="text-xs text-muted-foreground truncate">{job.companyName}</p>
                </div>
                <div className="flex items-center gap-2 ml-3 shrink-0">
                  {sla && (
                    <span className={cn(
                      'text-[10px] flex items-center gap-0.5',
                      job.isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground',
                    )}>
                      <Clock className="h-2.5 w-2.5" />
                      {sla}
                    </span>
                  )}
                  <Badge className={cn(
                    'text-xs min-w-[24px] justify-center',
                    job.isOverdue
                      ? 'bg-destructive/20 text-destructive border-destructive/30'
                      : 'bg-primary/20 text-primary border-primary/30',
                  )}>
                    {job.pendingCount}
                  </Badge>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </button>
            );
          })}

          {jobs.length > 4 && (
            <p className="text-xs text-muted-foreground text-center pt-1">
              + {jobs.length - 4} more role{jobs.length - 4 > 1 ? 's' : ''}
            </p>
          )}

          <Button
            variant="primary"
            className="w-full mt-3"
            size="sm"
            onClick={handleOpenAll}
          >
            <Eye className="h-4 w-4 mr-2" />
            Triage All Reviews
          </Button>
        </CardContent>
      </Card>

      <ReviewHubDialog
        open={hubOpen}
        onOpenChange={setHubOpen}
        initialJobId={selectedJobId}
        mode="internal"
      />
    </>
  );
};
