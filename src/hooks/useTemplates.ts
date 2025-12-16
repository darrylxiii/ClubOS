import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Template {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  content: any[];
  category: string | null;
  is_system: boolean;
  created_by: string | null;
  created_at: string;
  visibility: 'system' | 'company' | 'personal';
  company_id: string | null;
  cover_url: string | null;
  usage_count: number;
  updated_at: string;
  source_type: 'manual' | 'notion' | 'import';
}

export interface CreateTemplateParams {
  name: string;
  description?: string;
  icon?: string;
  content: any[];
  category?: string;
  visibility?: 'system' | 'company' | 'personal';
  company_id?: string;
  cover_url?: string;
  source_type?: 'manual' | 'notion' | 'import';
}

export function useTemplates() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all accessible templates
  const templatesQuery = useQuery({
    queryKey: ['templates', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('page_templates')
        .select('*')
        .order('usage_count', { ascending: false });

      if (error) throw error;
      return data as Template[];
    },
    enabled: !!user?.id,
  });

  // Fetch templates by category
  const useTemplatesByCategory = (category: string | null) => {
    return useQuery({
      queryKey: ['templates', 'category', category],
      queryFn: async () => {
        let query = supabase.from('page_templates').select('*');
        
        if (category) {
          query = query.eq('category', category);
        }
        
        const { data, error } = await query.order('usage_count', { ascending: false });
        if (error) throw error;
        return data as Template[];
      },
      enabled: !!user?.id,
    });
  };

  // Create a new template
  const createTemplate = useMutation({
    mutationFn: async (params: CreateTemplateParams) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('page_templates')
        .insert({
          name: params.name,
          description: params.description || null,
          icon: params.icon || null,
          content: params.content,
          category: params.category || 'custom',
          visibility: params.visibility || 'personal',
          company_id: params.company_id || null,
          cover_url: params.cover_url || null,
          source_type: params.source_type || 'manual',
          created_by: user.id,
          is_system: params.visibility === 'system',
        })
        .select()
        .single();

      if (error) throw error;
      return data as Template;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Template created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create template');
      console.error('Create template error:', error);
    },
  });

  // Update a template
  const updateTemplate = useMutation({
    mutationFn: async (params: { id: string; updates: Partial<Template> }) => {
      const { data, error } = await supabase
        .from('page_templates')
        .update({
          ...params.updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.id)
        .select()
        .single();

      if (error) throw error;
      return data as Template;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Template updated');
    },
    onError: (error) => {
      toast.error('Failed to update template');
      console.error('Update template error:', error);
    },
  });

  // Delete a template
  const deleteTemplate = useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from('page_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Template deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete template');
      console.error('Delete template error:', error);
    },
  });

  // Increment usage count when template is used
  const incrementUsage = useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase.rpc('increment_template_usage', {
        template_id: templateId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });

  // Get unique categories
  const categories = templatesQuery.data
    ? [...new Set(templatesQuery.data.map((t) => t.category).filter(Boolean))]
    : [];

  return {
    templates: templatesQuery.data || [],
    isLoading: templatesQuery.isLoading,
    categories,
    useTemplatesByCategory,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    incrementUsage,
    refetch: () => queryClient.invalidateQueries({ queryKey: ['templates'] }),
  };
}

export function useTemplate(templateId: string | undefined) {
  return useQuery({
    queryKey: ['template', templateId],
    queryFn: async () => {
      if (!templateId) return null;

      const { data, error } = await supabase
        .from('page_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (error) throw error;
      return data as Template;
    },
    enabled: !!templateId,
  });
}
