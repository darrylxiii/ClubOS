import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { WorkspacePage } from './useWorkspacePages';

export function usePageRealtime(pageId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!pageId) return;

    const channel = supabase
      .channel(`page-${pageId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'workspace_pages',
          filter: `id=eq.${pageId}`,
        },
        (payload) => {
          // Update the page cache with new data
          queryClient.setQueryData(
            ['workspace-page', pageId],
            (oldData: WorkspacePage | undefined) => {
              if (!oldData) return payload.new as WorkspacePage;
              return { ...oldData, ...payload.new } as WorkspacePage;
            }
          );
          
          // Also invalidate the pages list
          queryClient.invalidateQueries({ queryKey: ['workspace-pages'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pageId, queryClient]);
}

export function useWorkspacePagesRealtime(userId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('workspace-pages-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workspace_pages',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          // Invalidate all workspace queries on any change
          queryClient.invalidateQueries({ queryKey: ['workspace-pages'] });
          queryClient.invalidateQueries({ queryKey: ['workspace-favorites'] });
          queryClient.invalidateQueries({ queryKey: ['workspace-recent'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
}
