import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface PageVersion {
  id: string;
  page_id: string;
  content: any[];
  title: string | null;
  edited_by: string | null;
  created_at: string;
  version_number: number;
  editor_name?: string;
}

export function usePageVersions(pageId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const versionsQuery = useQuery({
    queryKey: ['page-versions', pageId],
    queryFn: async () => {
      if (!pageId) return [];

      const { data, error } = await supabase
        .from('page_versions')
        .select('*')
        .eq('page_id', pageId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Fetch editor names separately
      const editorIds = [...new Set(data.map(v => v.edited_by).filter((id): id is string => !!id))];
      let editorMap: Record<string, string> = {};

      if (editorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', editorIds);

        if (profiles) {
          editorMap = Object.fromEntries(profiles.map(p => [p.id, p.full_name || 'Unknown']));
        }
      }

      return data.map(v => ({
        ...v,
        editor_name: v.edited_by ? editorMap[v.edited_by] || 'Unknown' : 'Unknown',
      })) as PageVersion[];
    },
    enabled: !!pageId && !!user?.id,
  });

  const restoreVersion = useMutation({
    mutationFn: async (version: PageVersion) => {
      if (!user?.id || !pageId) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('workspace_pages')
        .update({
          content: version.content,
          title: version.title || undefined,
          last_edited_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', pageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-page', pageId] });
      queryClient.invalidateQueries({ queryKey: ['workspace-pages'] });
      queryClient.invalidateQueries({ queryKey: ['page-versions', pageId] });
      toast.success('Page restored to previous version');
    },
    onError: (error) => {
      toast.error('Failed to restore version');
      console.error('Restore version error:', error);
    },
  });

  return {
    versions: versionsQuery.data || [],
    isLoading: versionsQuery.isLoading,
    restoreVersion,
  };
}
