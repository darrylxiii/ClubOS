import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Block } from '@blocknote/core';

interface ContentChange {
  userId: string;
  timestamp: number;
  type: 'insert' | 'update' | 'delete' | 'replace';
  blockId?: string;
  content?: any;
  position?: number;
}

interface SyncState {
  isSyncing: boolean;
  lastSyncedAt: number | null;
  pendingChanges: number;
  conflictResolution: 'local' | 'remote' | 'merge';
}

export function useRealtimeContentSync(pageId: string | undefined) {
  const { user } = useAuth();
  const [syncState, setSyncState] = useState<SyncState>({
    isSyncing: false,
    lastSyncedAt: null,
    pendingChanges: 0,
    conflictResolution: 'merge'
  });
  const [remoteChanges, setRemoteChanges] = useState<ContentChange[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const pendingChangesRef = useRef<ContentChange[]>([]);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Broadcast content change
  const broadcastChange = useCallback((change: Omit<ContentChange, 'userId' | 'timestamp'>) => {
    if (!channelRef.current || !user || !pageId) return;

    const fullChange: ContentChange = {
      ...change,
      userId: user.id,
      timestamp: Date.now()
    };

    // Add to pending changes
    pendingChangesRef.current.push(fullChange);
    setSyncState(prev => ({ ...prev, pendingChanges: pendingChangesRef.current.length }));

    // Debounce broadcast to batch rapid changes
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      if (pendingChangesRef.current.length > 0) {
        channelRef.current?.send({
          type: 'broadcast',
          event: 'content_change',
          payload: {
            changes: pendingChangesRef.current,
            userId: user.id
          }
        });
        pendingChangesRef.current = [];
        setSyncState(prev => ({ 
          ...prev, 
          pendingChanges: 0,
          lastSyncedAt: Date.now()
        }));
      }
    }, 100); // 100ms debounce
  }, [user, pageId]);

  // Broadcast full content replacement (for major changes)
  const broadcastFullSync = useCallback((blocks: Block[]) => {
    if (!channelRef.current || !user || !pageId) return;

    setSyncState(prev => ({ ...prev, isSyncing: true }));

    channelRef.current.send({
      type: 'broadcast',
      event: 'full_sync',
      payload: {
        blocks,
        userId: user.id,
        timestamp: Date.now()
      }
    });

    setSyncState(prev => ({ 
      ...prev, 
      isSyncing: false,
      lastSyncedAt: Date.now()
    }));
  }, [user, pageId]);

  // Request sync from other users (for late joiners)
  const requestSync = useCallback(() => {
    if (!channelRef.current || !user || !pageId) return;

    channelRef.current.send({
      type: 'broadcast',
      event: 'sync_request',
      payload: {
        userId: user.id,
        timestamp: Date.now()
      }
    });
  }, [user, pageId]);

  useEffect(() => {
    if (!pageId || !user) return;

    const channel = supabase.channel(`content-sync-${pageId}`);

    channel
      .on('broadcast', { event: 'content_change' }, ({ payload }) => {
        if (payload.userId === user.id) return;
        
        setRemoteChanges(prev => [...prev, ...payload.changes]);
      })
      .on('broadcast', { event: 'full_sync' }, ({ payload }) => {
        if (payload.userId === user.id) return;
        
        // Handle full sync from another user
        setRemoteChanges([{
          userId: payload.userId,
          timestamp: payload.timestamp,
          type: 'replace',
          content: payload.blocks
        }]);
      })
      .on('broadcast', { event: 'sync_request' }, ({ payload }) => {
        if (payload.userId === user.id) return;
        
        // Another user is requesting sync - handled by component
        // This event is used to trigger a full sync broadcast
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [pageId, user]);

  // Clear processed remote changes
  const clearRemoteChanges = useCallback(() => {
    setRemoteChanges([]);
  }, []);

  return {
    syncState,
    remoteChanges,
    broadcastChange,
    broadcastFullSync,
    requestSync,
    clearRemoteChanges
  };
}
