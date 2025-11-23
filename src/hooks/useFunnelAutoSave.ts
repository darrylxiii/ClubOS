import { useEffect, useRef, useCallback } from 'react';

interface AutoSaveOptions {
    storageKey: string;
    debounceMs?: number;
    expiryHours?: number;
}

interface SavedFunnelData<T = any> {
    formData: T;
    currentStep: number;
    timestamp: string;
    sessionId: string;
    completed: boolean;
    expiresAt: string;
}

export function useFunnelAutoSave<T = any>(options: AutoSaveOptions) {
    const { storageKey, debounceMs = 300, expiryHours = 24 } = options;
    const debounceTimerRef = useRef<NodeJS.Timeout>();

    // Check if localStorage is available
    const isLocalStorageAvailable = useCallback(() => {
        try {
            const test = '__localStorage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch {
            return false;
        }
    }, []);

    // Save data to localStorage with debouncing
    const save = useCallback((formData: T, currentStep: number, sessionId: string) => {
        if (!isLocalStorageAvailable()) {
            console.warn('[AutoSave] localStorage not available');
            return;
        }

        // Clear existing debounce timer
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        // Set new debounce timer
        debounceTimerRef.current = setTimeout(() => {
            try {
                const now = new Date();
                const expiresAt = new Date(now.getTime() + expiryHours * 60 * 60 * 1000);

                const saveData: SavedFunnelData<T> = {
                    formData,
                    currentStep,
                    timestamp: now.toISOString(),
                    sessionId,
                    completed: false,
                    expiresAt: expiresAt.toISOString(),
                };

                localStorage.setItem(storageKey, JSON.stringify(saveData));
                console.log(`[AutoSave] Data saved at step ${currentStep}`);
            } catch (error: any) {
                if (error.name === 'QuotaExceededError') {
                    console.error('[AutoSave] localStorage quota exceeded');
                } else {
                    console.error('[AutoSave] Save failed:', error);
                }
            }
        }, debounceMs);
    }, [storageKey, debounceMs, expiryHours, isLocalStorageAvailable]);

    // Load data from localStorage
    const load = useCallback((): SavedFunnelData<T> | null => {
        if (!isLocalStorageAvailable()) {
            return null;
        }

        try {
            const savedDataStr = localStorage.getItem(storageKey);
            if (!savedDataStr) {
                return null;
            }

            const savedData: SavedFunnelData<T> = JSON.parse(savedDataStr);

            // Check if data has expired
            const expiresAt = new Date(savedData.expiresAt);
            if (expiresAt < new Date()) {
                console.log('[AutoSave] Saved data expired, clearing...');
                clear();
                return null;
            }

            // Check if already completed
            if (savedData.completed) {
                console.log('[AutoSave] Funnel already completed, clearing...');
                clear();
                return null;
            }

            console.log(`[AutoSave] Loaded data from step ${savedData.currentStep}`);
            return savedData;
        } catch (error) {
            console.error('[AutoSave] Load failed:', error);
            return null;
        }
    }, [storageKey, isLocalStorageAvailable]);

    // Clear saved data
    const clear = useCallback(() => {
        if (!isLocalStorageAvailable()) {
            return;
        }

        try {
            localStorage.removeItem(storageKey);
            console.log('[AutoSave] Data cleared');
        } catch (error) {
            console.error('[AutoSave] Clear failed:', error);
        }
    }, [storageKey, isLocalStorageAvailable]);

    // Mark as completed (will auto-clear on next load)
    const markCompleted = useCallback(() => {
        if (!isLocalStorageAvailable()) {
            return;
        }

        try {
            const savedDataStr = localStorage.getItem(storageKey);
            if (savedDataStr) {
                const savedData: SavedFunnelData<T> = JSON.parse(savedDataStr);
                savedData.completed = true;
                localStorage.setItem(storageKey, JSON.stringify(savedData));
                console.log('[AutoSave] Marked as completed');
            }
        } catch (error) {
            console.error('[AutoSave] Mark completed failed:', error);
        }
    }, [storageKey, isLocalStorageAvailable]);

    // Check if there is saved data available
    const hasSavedData = useCallback((): boolean => {
        const data = load();
        return data !== null;
    }, [load]);

    // Get timestamp of last save
    const getSavedTimestamp = useCallback((): Date | null => {
        const data = load();
        return data ? new Date(data.timestamp) : null;
    }, [load]);

    // Get relative time string (e.g., "2 hours ago")
    const getRelativeTime = useCallback((): string | null => {
        const timestamp = getSavedTimestamp();
        if (!timestamp) return null;

        const now = new Date();
        const diffMs = now.getTime() - timestamp.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    }, [getSavedTimestamp]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

    return {
        save,
        load,
        clear,
        markCompleted,
        hasSavedData,
        getSavedTimestamp,
        getRelativeTime,
        isAvailable: isLocalStorageAvailable(),
    };
}
