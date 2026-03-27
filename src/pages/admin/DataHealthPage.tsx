
import { useTranslation } from 'react-i18next';
import { DataHealthDashboard } from "@/components/admin/DataHealthDashboard";

export default function DataHealthPage() {
  const { t } = useTranslation('admin');
  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
      <DataHealthDashboard />
    </div>
  );
}
