import { useTranslation } from 'react-i18next';
import { PilotDashboard } from "@/components/clubpilot/PilotDashboard";

const ClubPilot = () => {
  const { t } = useTranslation('common');
  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      <PilotDashboard />
    </div>
  );
};

export default ClubPilot;
