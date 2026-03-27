import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table2, Radar } from 'lucide-react';
import { ComparisonTable } from '@/components/interviews/ComparisonTable';
import { ComparisonRadarChart } from '@/components/interviews/ComparisonRadarChart';
import { useCandidateComparison } from '@/hooks/useCandidateComparison';
import { cn } from '@/lib/utils';

interface PipelineComparisonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicationIds: string[];
}

export const PipelineComparisonDialog = memo(({
  open,
  onOpenChange,
  applicationIds,
}: PipelineComparisonDialogProps) => {
  const { t } = useTranslation('jobDashboard');
  const [viewMode, setViewMode] = useState<'table' | 'radar'>('table');
  const { data: candidates, isLoading } = useCandidateComparison(applicationIds, open);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>
              {t('comparison.title', 'Compare Candidates')} ({applicationIds.length})
            </DialogTitle>
            <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
              <Button
                variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 gap-1.5 text-xs"
                onClick={() => setViewMode('table')}
              >
                <Table2 className="w-3.5 h-3.5" />
                {t('comparison.table', 'Table')}
              </Button>
              <Button
                variant={viewMode === 'radar' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 gap-1.5 text-xs"
                onClick={() => setViewMode('radar')}
              >
                <Radar className="w-3.5 h-3.5" />
                {t('comparison.radar', 'Radar')}
              </Button>
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-64 rounded-lg" />
            <Skeleton className="h-32 rounded-lg" />
          </div>
        ) : candidates && candidates.length >= 2 ? (
          viewMode === 'table' ? (
            <ComparisonTable candidates={candidates} />
          ) : (
            <ComparisonRadarChart candidates={candidates} />
          )
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            {t('comparison.noData', 'Unable to load comparison data')}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
});

PipelineComparisonDialog.displayName = 'PipelineComparisonDialog';
