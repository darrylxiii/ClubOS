import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface WorkspacePage {
  id: string;
  user_id: string;
  parent_page_id: string | null;
  title: string;
  icon_emoji: string | null;
  icon_url: string | null;
  cover_url: string | null;
  content: any[];
  sort_order: number;
  is_template: boolean;
  is_favorite: boolean;
  is_archived: boolean;
  visibility: 'private' | 'shared' | 'public';
  last_edited_by: string | null;
  created_at: string;
  updated_at: string;
  children?: WorkspacePage[];
}

export interface PageTemplate {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  content: any[];
  category: string | null;
  is_system: boolean;
  created_by: string | null;
  created_at: string;
}

export function useWorkspacePages() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const pagesQuery = useQuery({
    queryKey: ['workspace-pages', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('workspace_pages')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as WorkspacePage[];
    },
    enabled: !!user?.id,
  });

  const favoritesQuery = useQuery({
    queryKey: ['workspace-favorites', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('workspace_pages')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_favorite', true)
        .eq('is_archived', false)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data as WorkspacePage[];
    },
    enabled: !!user?.id,
  });

  const recentQuery = useQuery({
    queryKey: ['workspace-recent', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('page_visits')
        .select('page_id, visited_at, workspace_pages(*)')
        .eq('user_id', user.id)
        .order('visited_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data?.map(v => v.workspace_pages).filter(Boolean) as WorkspacePage[];
    },
    enabled: !!user?.id,
  });

  const templatesQuery = useQuery({
    queryKey: ['page-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('page_templates')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as PageTemplate[];
    },
  });

  const createPage = useMutation({
    mutationFn: async (params: { 
      title?: string; 
      parent_page_id?: string | null;
      content?: any[];
      icon_emoji?: string;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('workspace_pages')
        .insert({
          user_id: user.id,
          title: params.title || 'Untitled',
          parent_page_id: params.parent_page_id || null,
          content: params.content || [],
          icon_emoji: params.icon_emoji || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as WorkspacePage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-pages'] });
    },
    onError: (error) => {
      toast.error('Failed to create page');
      console.error('Create page error:', error);
    },
  });

  const updatePage = useMutation({
    mutationFn: async (params: { 
      id: string; 
      updates: Partial<WorkspacePage>;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('workspace_pages')
        .update({
          ...params.updates,
          last_edited_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.id)
        .select()
        .single();

      if (error) throw error;
      return data as WorkspacePage;
    },
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['workspace-page', variables.id] });
      await queryClient.cancelQueries({ queryKey: ['workspace-pages'] });
      
      // Snapshot previous values
      const previousPage = queryClient.getQueryData(['workspace-page', variables.id]);
      const previousPages = queryClient.getQueryData(['workspace-pages', user?.id]);
      
      // Optimistically update the single page
      queryClient.setQueryData(['workspace-page', variables.id], (old: WorkspacePage | undefined) => {
        if (!old) return old;
        return { ...old, ...variables.updates };
      });
      
      // Optimistically update the pages list
      queryClient.setQueryData(['workspace-pages', user?.id], (old: WorkspacePage[] | undefined) => {
        if (!old) return old;
        return old.map(page => 
          page.id === variables.id ? { ...page, ...variables.updates } : page
        );
      });
      
      return { previousPage, previousPages };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workspace-pages'] });
      queryClient.invalidateQueries({ queryKey: ['workspace-favorites'] });
      queryClient.invalidateQueries({ queryKey: ['workspace-page', variables.id] });
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousPage) {
        queryClient.setQueryData(['workspace-page', variables.id], context.previousPage);
      }
      if (context?.previousPages) {
        queryClient.setQueryData(['workspace-pages', user?.id], context.previousPages);
      }
      toast.error('Failed to update page');
      console.error('Update page error:', error);
    },
  });

  const deletePage = useMutation({
    mutationFn: async (pageId: string) => {
      const { error } = await supabase
        .from('workspace_pages')
        .update({ is_archived: true })
        .eq('id', pageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-pages'] });
      queryClient.invalidateQueries({ queryKey: ['workspace-favorites'] });
      toast.success('Page moved to trash');
    },
    onError: (error) => {
      toast.error('Failed to delete page');
      console.error('Delete page error:', error);
    },
  });

  const toggleFavorite = useMutation({
    mutationFn: async (params: { id: string; is_favorite: boolean }) => {
      const { error } = await supabase
        .from('workspace_pages')
        .update({ is_favorite: params.is_favorite })
        .eq('id', params.id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workspace-pages'] });
      queryClient.invalidateQueries({ queryKey: ['workspace-favorites'] });
      toast.success(variables.is_favorite ? 'Added to favorites' : 'Removed from favorites');
    },
  });

  const recordVisit = useMutation({
    mutationFn: async (pageId: string) => {
      if (!user?.id) return;
      
      await supabase
        .from('page_visits')
        .upsert({
          user_id: user.id,
          page_id: pageId,
          visited_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,page_id',
        });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-recent'] });
    },
  });

  const duplicatePage = useMutation({
    mutationFn: async (page: WorkspacePage) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('workspace_pages')
        .insert({
          user_id: user.id,
          title: `${page.title} (Copy)`,
          parent_page_id: page.parent_page_id,
          content: page.content,
          icon_emoji: page.icon_emoji,
          cover_url: page.cover_url,
        })
        .select()
        .single();

      if (error) throw error;
      return data as WorkspacePage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-pages'] });
      toast.success('Page duplicated');
    },
  });

  // Build tree structure from flat pages
  const buildPageTree = (pages: WorkspacePage[]): WorkspacePage[] => {
    const pageMap = new Map<string, WorkspacePage>();
    const rootPages: WorkspacePage[] = [];

    // First pass: create map
    pages.forEach(page => {
      pageMap.set(page.id, { ...page, children: [] });
    });

    // Second pass: build tree
    pages.forEach(page => {
      const node = pageMap.get(page.id)!;
      if (page.parent_page_id && pageMap.has(page.parent_page_id)) {
        pageMap.get(page.parent_page_id)!.children!.push(node);
      } else {
        rootPages.push(node);
      }
    });

    return rootPages;
  };

  return {
    pages: pagesQuery.data || [],
    pageTree: buildPageTree(pagesQuery.data || []),
    favorites: favoritesQuery.data || [],
    recent: recentQuery.data || [],
    templates: templatesQuery.data || [],
    isLoading: pagesQuery.isLoading,
    createPage,
    updatePage,
    deletePage,
    toggleFavorite,
    recordVisit,
    duplicatePage,
  };
}

export function useWorkspacePage(pageId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['workspace-page', pageId],
    queryFn: async () => {
      if (!pageId) return null;
      
      const { data, error } = await supabase
        .from('workspace_pages')
        .select('*')
        .eq('id', pageId)
        .single();

      if (error) throw error;
      return data as WorkspacePage;
    },
    enabled: !!pageId && !!user?.id,
  });
}
