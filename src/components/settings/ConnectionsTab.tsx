import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AccountLinking } from '@/components/AccountLinking';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

interface ConnectionsTabProps {
  userId: string | null;
}

export function ConnectionsTab({ userId }: ConnectionsTabProps) {
  if (!userId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Connections</CardTitle>
          <CardDescription>Please log in to manage your connections</CardDescription>
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
          <CardTitle>Account Linking</CardTitle>
          <CardDescription>Link multiple authentication methods to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <AccountLinking />
        </CardContent>
      </Card>
    </div>
  );
}
