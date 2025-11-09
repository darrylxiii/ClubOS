import { memo } from 'react';
import { AssessmentResultsManager } from '@/components/admin/AssessmentResultsManager';

export const ResultsDashboardTab = memo(() => {
  return (
    <div className="space-y-6">
      <AssessmentResultsManager />
    </div>
  );
});

ResultsDashboardTab.displayName = 'ResultsDashboardTab';
