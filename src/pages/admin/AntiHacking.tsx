import { useTranslation } from 'react-i18next';
import { AntiHackingDashboard } from '@/components/admin/security/AntiHackingDashboard';

export default function AntiHacking() {
  const { t } = useTranslation('admin');
  return <AntiHackingDashboard />;
}
