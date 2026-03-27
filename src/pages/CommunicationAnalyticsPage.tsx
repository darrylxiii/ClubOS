import { useTranslation } from 'react-i18next';
import CommunicationAnalyticsDashboard from '@/components/communication/CommunicationAnalyticsDashboard';

export default function CommunicationAnalyticsPage() {
  const { t } = useTranslation('common');
  return <CommunicationAnalyticsDashboard />;
}
