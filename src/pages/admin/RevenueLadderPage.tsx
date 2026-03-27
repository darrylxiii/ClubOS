import { useTranslation } from 'react-i18next';
import { RevenueLadderDashboard } from '@/components/revenue-ladder/RevenueLadderDashboard';

export default function RevenueLadderPage() {
  const { t } = useTranslation('admin');
  return <RevenueLadderDashboard />;
}
