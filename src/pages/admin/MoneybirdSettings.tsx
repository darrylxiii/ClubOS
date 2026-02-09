import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MoneybirdSettingsCard } from '@/components/admin/MoneybirdSettingsCard';
import { MoneybirdSyncStatus } from '@/components/admin/MoneybirdSyncStatus';
import { MoneybirdSyncLogs } from '@/components/admin/MoneybirdSyncLogs';
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
    <div className="space-y-6">
      <MoneybirdSettingsCard />
      <MoneybirdSyncStatus />
      <MoneybirdSyncLogs />
    </div>
  );
}
