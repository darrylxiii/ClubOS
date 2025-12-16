import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Backlink {
  id: string;
  source_page_id: string;
  target_page_id: string;
  block_id: string | null;
  link_text: string | null;
  created_at: string;
  source_page?: {
    id: string;
    title: string;
    icon_emoji: string | null;
  };
}

export function usePageBacklinks(pageId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch backlinks (pages linking TO this page)
  const { data: backlinks = [], isLoading } = useQuery({
    queryKey: ['page-backlinks', pageId],
    queryFn: async () => {
      if (!pageId) return [];
      
      const { data, error } = await supabase
        .from('page_backlinks')
        .select('*')
        .eq('target_page_id', pageId);

      if (error) throw error;
      
      // Fetch source page details
      if (data && data.length > 0) {
        const sourceIds = [...new Set(data.map(b => b.source_page_id))];
        const { data: pages } = await supabase
          .from('workspace_pages')
          .select('id, title, icon_emoji')
          .in('id', sourceIds);
        
        const pageMap = new Map(pages?.map(p => [p.id, p]) || []);
        return data.map(b => ({
          ...b,
          source_page: pageMap.get(b.source_page_id)
        })) as Backlink[];
      }
      
      return data as Backlink[];
    },
    enabled: !!pageId && !!user,
  });

  // Update backlinks when page content changes
  const updateBacklinks = useMutation({
    mutationFn: async ({ sourcePageId, links }: { 
      sourcePageId: string; 
      links: Array<{ targetPageId: string; blockId?: string; linkText?: string }> 
    }) => {
      // Delete existing backlinks from this source
      await supabase
        .from('page_backlinks')
        .delete()
        .eq('source_page_id', sourcePageId);

      // Insert new backlinks
      if (links.length > 0) {
        const { error } = await supabase
          .from('page_backlinks')
          .insert(links.map(link => ({
            source_page_id: sourcePageId,
            target_page_id: link.targetPageId,
            block_id: link.blockId || null,
            link_text: link.linkText || null,
          })));
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['page-backlinks'] });
    },
  });

  return {
    backlinks,
    isLoading,
    updateBacklinks,
  };
}
