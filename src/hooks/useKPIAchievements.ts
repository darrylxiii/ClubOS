import { useState, useEffect, useRef, useCallback } from 'react';
import { UnifiedKPI, KPIStatus } from './useUnifiedKPIs';

export interface KPIAchievement {
  kpiId: string;
  kpiName: string;
  displayName: string;
  previousStatus: KPIStatus;
  newStatus: KPIStatus;
  value: number | string;
  timestamp: Date;
}

// Storage key for previous statuses
const STORAGE_KEY = 'kpi-previous-statuses';

function loadPreviousStatuses(): Record<string, KPIStatus> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function savePreviousStatuses(statuses: Record<string, KPIStatus>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(statuses));
  } catch {
    // Ignore storage errors
  }
}

export function useKPIAchievements(kpis: UnifiedKPI[]) {
  const [achievements, setAchievements] = useState<KPIAchievement[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const previousStatusesRef = useRef<Record<string, KPIStatus>>(loadPreviousStatuses());
  const hasInitializedRef = useRef(false);

  // Check for status improvements
  useEffect(() => {
    if (kpis.length === 0) return;

    const previousStatuses = previousStatusesRef.current;
    const newAchievements: KPIAchievement[] = [];

    // Skip on first load (just record initial statuses)
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      const newStatuses: Record<string, KPIStatus> = {};
      kpis.forEach(kpi => {
        newStatuses[kpi.id] = kpi.status;
      });
      previousStatusesRef.current = newStatuses;
      savePreviousStatuses(newStatuses);
      return;
    }

    // Check each KPI for improvements
    kpis.forEach(kpi => {
      const previousStatus = previousStatuses[kpi.id];
      const currentStatus = kpi.status;

      // Only trigger on improvements
      if (previousStatus && currentStatus !== previousStatus) {
        const isImprovement = 
          (previousStatus === 'critical' && (currentStatus === 'warning' || currentStatus === 'success')) ||
          (previousStatus === 'warning' && currentStatus === 'success');

        if (isImprovement) {
          newAchievements.push({
            kpiId: kpi.id,
            kpiName: kpi.name,
            displayName: kpi.displayName,
            previousStatus,
            newStatus: currentStatus,
            value: kpi.value,
            timestamp: new Date()
          });
        }
      }
    });

    // Update stored statuses
    const newStatuses: Record<string, KPIStatus> = {};
    kpis.forEach(kpi => {
      newStatuses[kpi.id] = kpi.status;
    });
    previousStatusesRef.current = newStatuses;
    savePreviousStatuses(newStatuses);

    // Trigger celebration if there are new achievements
    if (newAchievements.length > 0) {
      setAchievements(prev => [...newAchievements, ...prev].slice(0, 10)); // Keep last 10
      setShowCelebration(true);
    }
  }, [kpis]);

  const dismissCelebration = useCallback(() => {
    setShowCelebration(false);
  }, []);

  const clearAchievements = useCallback(() => {
    setAchievements([]);
  }, []);

  // Get latest achievement for celebration
  const latestAchievement = achievements[0] || null;

  return {
    achievements,
    latestAchievement,
    showCelebration,
    dismissCelebration,
    clearAchievements
  };
}
