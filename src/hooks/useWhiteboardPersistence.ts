import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface WhiteboardPersistenceOptions {
    channelId: string;
    enabled: boolean;
    autoSaveInterval?: number; // milliseconds, default 3000
}

export function useWhiteboardPersistence({
    channelId,
    enabled,
    autoSaveInterval = 3000
}: WhiteboardPersistenceOptions) {
    const { user } = useAuth();
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastSavedStateRef = useRef<string | null>(null);

    /**
     * Load whiteboard state from database
     */
    const loadWhiteboardState = useCallback(async (): Promise<any | null> => {
        if (!enabled || !channelId) return null;

        try {
            const { data, error } = await supabase
                .from('whiteboard_states')
                .select('state_data')
                .eq('channel_id', channelId)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    // No state found - this is fine for new whiteboards
                    return null;
                }
                throw error;
            }

            return data?.state_data || null;
        } catch (error: any) {
            console.error('Error loading whiteboard state:', error);
            toast.error('Failed to load whiteboard state');
            return null;
        }
    }, [enabled, channelId]);

    /**
     * Save whiteboard state to database
     */
    const saveWhiteboardState = useCallback(async (stateData: any) => {
        if (!enabled || !channelId || !user) return;

        // Check if state has changed
        const stateString = JSON.stringify(stateData);
        if (stateString === lastSavedStateRef.current) {
            return; // No changes, skip save
        }

        try {
            const { error } = await supabase
                .from('whiteboard_states')
                .upsert({
                    channel_id: channelId,
                    state_data: stateData,
                    updated_by: user.id
                }, {
                    onConflict: 'channel_id'
                });

            if (error) throw error;

            lastSavedStateRef.current = stateString;
        } catch (error: any) {
            console.error('Error saving whiteboard state:', error);
            toast.error('Failed to save whiteboard state');
        }
    }, [enabled, channelId, user]);

    /**
     * Debounced auto-save function
     */
    const scheduleAutoSave = useCallback((stateData: any) => {
        if (!enabled) return;

        // Clear existing timeout
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        // Schedule new save
        saveTimeoutRef.current = setTimeout(() => {
            saveWhiteboardState(stateData);
        }, autoSaveInterval);
    }, [enabled, autoSaveInterval, saveWhiteboardState]);

    /**
     * Log operation to history (for undo/redo)
     */
    const logOperation = useCallback(async (
        operationType: 'draw' | 'erase' | 'clear' | 'undo' | 'redo',
        operationData: any
    ) => {
        if (!enabled || !channelId || !user) return;

        try {
            await supabase
                .from('whiteboard_history')
                .insert({
                    channel_id: channelId,
                    operation_type: operationType,
                    operation_data: operationData,
                    user_id: user.id
                });
        } catch (error: any) {
            console.error('Error logging whiteboard operation:', error);
        }
    }, [enabled, channelId, user]);

    /**
     * Subscribe to remote whiteboard changes
     */
    const subscribeToChanges = useCallback((
        onRemoteUpdate: (stateData: any, userId: string) => void
    ) => {
        if (!enabled || !channelId) return () => { };

        const channel = supabase
            .channel(`whiteboard:${channelId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'whiteboard_states',
                    filter: `channel_id=eq.${channelId}`
                },
                (payload) => {
                    // Ignore updates from current user
                    if (payload.new.updated_by === user?.id) return;

                    onRemoteUpdate(payload.new.state_data, payload.new.updated_by);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [enabled, channelId, user]);

    /**
     * Clear whiteboard state
     */
    const clearWhiteboardState = useCallback(async () => {
        if (!enabled || !channelId || !user) return;

        try {
            await supabase
                .from('whiteboard_states')
                .delete()
                .eq('channel_id', channelId);

            await logOperation('clear', {});

            lastSavedStateRef.current = null;
            toast.success('Whiteboard cleared');
        } catch (error: any) {
            console.error('Error clearing whiteboard:', error);
            toast.error('Failed to clear whiteboard');
        }
    }, [enabled, channelId, user, logOperation]);

    /**
     * Export whiteboard to JSON
     */
    const exportToJSON = useCallback(async (): Promise<string | null> => {
        const state = await loadWhiteboardState();
        if (!state) return null;

        return JSON.stringify(state, null, 2);
    }, [loadWhiteboardState]);

    /**
     * Import whiteboard from JSON
     */
    const importFromJSON = useCallback(async (jsonString: string) => {
        try {
            const stateData = JSON.parse(jsonString);
            await saveWhiteboardState(stateData);
            toast.success('Whiteboard imported');
            return stateData;
        } catch (error: any) {
            console.error('Error importing whiteboard:', error);
            toast.error('Invalid whiteboard data');
            return null;
        }
    }, [saveWhiteboardState]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, []);

    return {
        loadWhiteboardState,
        saveWhiteboardState,
        scheduleAutoSave,
        logOperation,
        subscribeToChanges,
        clearWhiteboardState,
        exportToJSON,
        importFromJSON
    };
}
