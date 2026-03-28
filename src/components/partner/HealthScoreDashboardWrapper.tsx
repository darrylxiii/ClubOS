import { useRole } from '@/contexts/RoleContext';
import { HealthScoreDashboard } from './HealthScoreDashboard';
import { EmptyState } from '@/components/ui/empty-state';
import { Activity } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function HealthScoreDashboardWrapper() {
  const { t } = useTranslation('partner');
  const { companyId } = useRole();

  if (!companyId) {
    return (
      <EmptyState
        title={t('healthScore.noCompany', 'No company linked')}
        description={t('healthScore.noCompanyDesc', 'Health scores will appear once your company profile is set up.')}
        icon={Activity}
      />
    );
  }

  return <HealthScoreDashboard companyId={companyId} />;
}
