import { useTranslation } from 'react-i18next';
import { RoleGate } from "@/components/RoleGate";
import { DisputeCenter } from "@/components/projects/disputes/DisputeCenter";

export default function ProjectDisputesPage() {
  const { t } = useTranslation('common');
  return (
    <RoleGate allowedRoles={['admin', 'strategist']}>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <DisputeCenter />
      </div>
    </RoleGate>
  );
}