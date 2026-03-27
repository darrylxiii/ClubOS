import { AdminMemberRequests } from "@/components/admin/AdminMemberRequests";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useTranslation } from 'react-i18next';

const PendingRequestsTab = () => {
  const { t } = useTranslation('admin');
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('users.pendingRequestsTab.pendingRequests')}</CardTitle>
        <CardDescription>
          Review and approve new member applications from candidates and partners
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AdminMemberRequests />
      </CardContent>
    </Card>
  );
};

export default PendingRequestsTab;
