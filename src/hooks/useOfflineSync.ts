import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import * as offlineStorage from '@/services/offlineStorage';
import { notify } from '@/lib/notify';
import { logger } from '@/lib/logger';

interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingActions: number;
  lastSyncAt: Date | null;
}

export function useOfflineSync(userId: string | undefined) {
  const [state, setState] = useState<SyncState>({
    isOnline: navigator.onLine,
    isSyncing: false,
    pendingActions: 0,
    lastSyncAt: null,
  });
  
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isSyncingRef = useRef(false);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setState(prev => ({ ...prev, isOnline: true }));
      notify.success("Back online", { description: "Syncing your changes..." });
      // Trigger sync when coming back online
      syncPendingActions();
    };

    const handleOffline = () => {
      setState(prev => ({ ...prev, isOnline: false }));
      notify.error("You're offline", {
        description: "Changes will be synced when you're back online.",
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Check pending actions count
  const updatePendingCount = useCallback(async () => {
    try {
      const actions = await offlineStorage.getOfflineActions();
      setState(prev => ({ ...prev, pendingActions: actions.length }));
    } catch (error) {
      console.error('Error getting pending actions:', error);
    }
  }, []);

  // Sync pending actions to server
  const syncPendingActions = useCallback(async () => {
    if (!navigator.onLine || isSyncingRef.current || !userId) return;
    
    isSyncingRef.current = true;
    setState(prev => ({ ...prev, isSyncing: true }));

    try {
      const actions = await offlineStorage.getOfflineActions();
      
      for (const action of actions) {
        try {
          // Skip actions that have failed too many times
          if (action.retryCount >= 3) {
            logger.warn('Skipping action after max retries', { componentName: 'OfflineSync', actionId: action.id, retryCount: action.retryCount });
            continue;
          }

          let success = false;

          switch (action.entity) {
            case 'message':
              if (action.type === 'create') {
                const { error } = await supabase
                  .from('messages')
                  .insert(action.payload);
                success = !error;
              }
              break;
            
            case 'application':
              if (action.type === 'update') {
                const { error } = await supabase
                  .from('applications')
                  .update(action.payload.updates)
                  .eq('id', action.payload.id);
                success = !error;
              }
              break;
            
            // Add more entity handlers as needed
            default:
              logger.warn('Unknown entity type', { componentName: 'OfflineSync', entity: action.entity });
          }

          if (success) {
            await offlineStorage.removeOfflineAction(action.id);
          } else {
            await offlineStorage.incrementRetryCount(action.id);
          }
        } catch (error) {
          console.error(`Error syncing action ${action.id}:`, error);
          await offlineStorage.incrementRetryCount(action.id);
        }
      }

      await updatePendingCount();
      setState(prev => ({ 
        ...prev, 
        isSyncing: false, 
        lastSyncAt: new Date() 
      }));
    } catch (error) {
      console.error('Error syncing pending actions:', error);
      setState(prev => ({ ...prev, isSyncing: false }));
    } finally {
      isSyncingRef.current = false;
    }
  }, [userId, updatePendingCount]);

  // Cache critical data for offline use
  const cacheUserData = useCallback(async () => {
    if (!userId || !navigator.onLine) return;

    try {
      // Cache user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (profile) {
        await offlineStorage.saveUserProfile(userId, profile);
      }

      // Cache recent applications
      const { data: applications } = await supabase
        .from('applications')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(50);
      
      if (applications) {
        await offlineStorage.saveApplications(applications);
      }

      // Cache jobs the user has applied to or might be interested in
      const { data: jobs } = await supabase
        .from('jobs')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (jobs) {
        await offlineStorage.saveJobs(jobs);
      }

      await offlineStorage.updateSyncStatus('all', 'idle');
    } catch (error) {
      console.error('Error caching user data:', error);
      await offlineStorage.updateSyncStatus('all', 'error', String(error));
    }
  }, [userId]);

  // Queue an action for offline processing
  const queueAction = useCallback(async (
    type: 'create' | 'update' | 'delete',
    entity: string,
    payload: any
  ) => {
    const id = await offlineStorage.queueOfflineAction(type, entity, payload);
    await updatePendingCount();
    
    // If online, try to sync immediately
    if (navigator.onLine) {
      syncPendingActions();
    }
    
    return id;
  }, [syncPendingActions, updatePendingCount]);

  // Get cached data
  const getCachedProfile = useCallback(async () => {
    if (!userId) return null;
    return offlineStorage.getUserProfile(userId);
  }, [userId]);

  const getCachedJobs = useCallback(async () => {
    return offlineStorage.getJobs();
  }, []);

  const getCachedApplications = useCallback(async () => {
    return offlineStorage.getApplications();
  }, []);

  // Set up periodic sync
  useEffect(() => {
    if (userId) {
      // Initial cache
      cacheUserData();
      updatePendingCount();

      // Sync every 5 minutes when online
      syncIntervalRef.current = setInterval(() => {
        if (navigator.onLine) {
          cacheUserData();
          syncPendingActions();
        }
      }, 5 * 60 * 1000);

      return () => {
        if (syncIntervalRef.current) {
          clearInterval(syncIntervalRef.current);
        }
      };
    }
  }, [userId, cacheUserData, syncPendingActions, updatePendingCount]);

  // Clear offline data on logout
  const clearOfflineData = useCallback(async () => {
    await offlineStorage.clearAllOfflineData();
    setState({
      isOnline: navigator.onLine,
      isSyncing: false,
      pendingActions: 0,
      lastSyncAt: null,
    });
  }, []);

  return {
    ...state,
    queueAction,
    syncPendingActions,
    cacheUserData,
    getCachedProfile,
    getCachedJobs,
    getCachedApplications,
    clearOfflineData,
  };
}
