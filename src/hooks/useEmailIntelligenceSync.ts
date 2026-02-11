import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { notify } from '@/lib/notify';

interface SyncResults {
  domainsExtracted: number;
  contactsCreated: number;
  emailsMatched: number;
  companiesAggregated: number;
  errors: string[];
}

export function useEmailIntelligenceSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResults, setLastSyncResults] = useState<SyncResults | null>(null);

  const syncEmailIntelligence = async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('populate-email-intelligence');

      if (error) {
        throw error;
      }

      if (data?.success) {
        setLastSyncResults(data.results);
        notify.success('Email Intelligence Synced', {
          description: `Matched ${data.results.emailsMatched} emails to ${data.results.companiesAggregated} companies`,
        });
        return data.results;
      } else {
        throw new Error(data?.error || 'Unknown error');
      }
    } catch (error: unknown) {
      console.error('Email intelligence sync error:', error);
      notify.error('Sync Failed', {
        description: error instanceof Error ? error.message : 'Failed to sync email intelligence',
      });
      return null;
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    syncEmailIntelligence,
    isSyncing,
    lastSyncResults,
  };
}
