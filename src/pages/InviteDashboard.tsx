import { useTranslation } from 'react-i18next';
import { InviteDashboardLayout } from "@/components/invites/InviteDashboardLayout";

export default function InviteDashboard() {
  const { t } = useTranslation('common');
  return <InviteDashboardLayout />;
}
