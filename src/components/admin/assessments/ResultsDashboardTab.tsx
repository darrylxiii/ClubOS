import { memo } from 'react';
import { AssessmentResultsManager } from '@/components/admin/AssessmentResultsManager';
import { useTranslation } from 'react-i18next';

export const ResultsDashboardTab = memo(() => {
  const { t } = useTranslation('admin');
  return (
    <div className="space-y-6">
      <AssessmentResultsManager />
    </div>
  );
});

ResultsDashboardTab.displayName = 'ResultsDashboardTab';
