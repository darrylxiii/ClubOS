import { useTranslation } from 'react-i18next';
import { FreelancerProfileBuilder } from "@/components/projects/freelancer/FreelancerProfileBuilder";

export default function FreelancerSetupPage() {
  const { t } = useTranslation('common');
  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      <FreelancerProfileBuilder />
    </div>
  );
}