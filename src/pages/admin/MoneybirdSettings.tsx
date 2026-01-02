import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { RoleGate } from '@/components/RoleGate';
import { MoneybirdSettingsCard } from '@/components/admin/MoneybirdSettingsCard';
import { MoneybirdSyncStatus } from '@/components/admin/MoneybirdSyncStatus';
import { MoneybirdSyncLogs } from '@/components/admin/MoneybirdSyncLogs';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Banknote } from 'lucide-react';
import { toast } from 'sonner';

export default function MoneybirdSettings() {
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    if (success === 'connected') {
      toast.success('Moneybird connected successfully', {
        description: 'You can now sync contacts and create invoices.',
      });
      setSearchParams({});
    }

    if (error) {
      const errorMessages: Record<string, string> = {
        invalid_state: 'Invalid OAuth state. Please try again.',
        token_exchange_failed: 'Failed to exchange authorization code.',
        fetch_administrations_failed: 'Failed to fetch Moneybird administrations.',
        storage_failed: 'Failed to store connection settings.',
      };
      toast.error('Connection failed', {
        description: errorMessages[error] || error,
      });
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  return (
    <RoleGate allowedRoles={['admin']} showLoading>
      <AppLayout>
        <div className="container mx-auto py-6 space-y-6 max-w-6xl">
          {/* Breadcrumb */}
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="/admin/financial">Financial</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Moneybird</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {/* Header */}
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <Banknote className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Moneybird Integration</h1>
              <p className="text-muted-foreground mt-1">
                Connect to Moneybird for automated invoicing and payment tracking
              </p>
            </div>
          </div>

          {/* Connection & Settings */}
          <MoneybirdSettingsCard />

          {/* Sync Status */}
          <MoneybirdSyncStatus />

          {/* Sync Logs */}
          <MoneybirdSyncLogs />
        </div>
      </AppLayout>
    </RoleGate>
  );
}
