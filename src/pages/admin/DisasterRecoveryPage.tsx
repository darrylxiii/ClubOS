import { useTranslation } from 'react-i18next';
import { DisasterRecoveryDashboard } from '@/components/admin/DisasterRecoveryDashboard';

export default function DisasterRecoveryPage() {
  const { t } = useTranslation('admin');
  return <DisasterRecoveryDashboard />;
}
