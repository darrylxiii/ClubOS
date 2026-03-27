
import { useTranslation } from 'react-i18next';
import { GigMarketplace } from "@/components/projects/freelancer/GigMarketplace";

export default function GigMarketplacePage() {
  const { t } = useTranslation('common');
  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      <GigMarketplace />
    </div>
  );
}