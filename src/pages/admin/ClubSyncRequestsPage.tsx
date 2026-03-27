import { useTranslation } from 'react-i18next';
import { ClubSyncRequests } from "@/components/admin/ClubSyncRequests";

const ClubSyncRequestsPage = () => {
  const { t } = useTranslation('admin');
  return <ClubSyncRequests />;
};

export default ClubSyncRequestsPage;
