import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AccountLinking } from '@/components/AccountLinking';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

interface ConnectionsTabProps {
  userId: string | null;
}

export function ConnectionsTab({ userId }: ConnectionsTabProps) {
  const { t } = useTranslation('common');
  if (!userId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("connections", "Connections")}</CardTitle>
          <CardDescription>{t("please_log_in_to", "Please log in to manage your connections")}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Manage your connected accounts and authentication methods
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>{t("account_linking", "Account Linking")}</CardTitle>
          <CardDescription>{t("link_multiple_authentication_methods", "Link multiple authentication methods to your account")}</CardDescription>
        </CardHeader>
        <CardContent>
          <AccountLinking />
        </CardContent>
      </Card>
    </div>
  );
}
