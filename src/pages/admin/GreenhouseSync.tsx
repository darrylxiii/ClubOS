import { useTranslation } from 'react-i18next';
import GreenhouseSyncPanel from '@/components/admin/GreenhouseSyncPanel';

export default function GreenhouseSync() {
  const { t } = useTranslation('admin');
  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      <GreenhouseSyncPanel />
    </div>
  );
}
