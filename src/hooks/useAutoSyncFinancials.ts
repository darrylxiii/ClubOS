import { useEffect, useRef } from "react";
import { useMoneybirdFinancials, useSyncMoneybirdFinancials } from "./useMoneybirdFinancials";

const STALE_THRESHOLD_MS = 6 * 60 * 60 * 1000; // 6 hours
const SYNC_DEBOUNCE_MS = 2 * 60 * 1000; // 2 minutes between syncs

export function useAutoSyncFinancials(year: number) {
  const { data: metrics, isLoading } = useMoneybirdFinancials(year);
  const { mutate: syncFinancials, isPending: isSyncing } = useSyncMoneybirdFinancials();
  const lastSyncAttempt = useRef<number>(0);
  const hasTriggeredSync = useRef<number | null>(null);

  useEffect(() => {
    // Don't sync if we're still loading or already syncing
    if (isLoading || isSyncing) return;

    // Don't sync the same year twice in quick succession
    if (hasTriggeredSync.current === year) return;

    // Debounce: don't sync if we synced recently
    const now = Date.now();
    if (now - lastSyncAttempt.current < SYNC_DEBOUNCE_MS) return;

    // Check if we need to sync
    let shouldSync = false;

    if (!metrics) {
      // No data for this year
      shouldSync = true;
      console.log(`[AutoSync] No data for ${year}, triggering sync`);
    } else if (metrics.last_synced_at) {
      const lastSynced = new Date(metrics.last_synced_at).getTime();
      if (now - lastSynced > STALE_THRESHOLD_MS) {
        shouldSync = true;
        console.log(`[AutoSync] Data for ${year} is stale, triggering sync`);
      }
    }

    if (shouldSync) {
      lastSyncAttempt.current = now;
      hasTriggeredSync.current = year;
      syncFinancials(year);
    }
  }, [year, metrics, isLoading, isSyncing, syncFinancials]);

  return { isSyncing };
}
