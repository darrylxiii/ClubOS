import { useTranslation } from 'react-i18next';
import { AdminMemberRequests } from "@/components/admin/AdminMemberRequests";

const MemberRequestsPage = () => {
  const { t } = useTranslation('admin');
  return <AdminMemberRequests />;
};

export default MemberRequestsPage;
