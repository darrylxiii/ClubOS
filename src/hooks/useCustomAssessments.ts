import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AssessmentTemplate } from '@/types/assessment';

export const useCustomAssessments = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const createTemplate = async (template: Omit<AssessmentTemplate, 'id' | 'created_by' | 'created_at' | 'updated_at'>) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('assessment_templates')
        .insert({
          title: template.title,
          description: template.description,
          category: template.category,
          icon: template.icon,
          estimated_time: template.estimated_time,
          is_active: template.is_active,
          is_public: template.is_public,
          configuration: template.configuration as any,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Template created',
        description: 'Custom assessment template has been created successfully',
      });

      return { success: true, data: data as unknown as AssessmentTemplate };
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const getTemplates = async (includePublic = true) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let query = supabase
        .from('assessment_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (!includePublic) {
        query = query.eq('created_by', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      return { success: true, data: data as unknown as AssessmentTemplate[] };
    } catch (error: any) {
      toast({
        title: 'Error loading templates',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false, error: error.message };
    }
  };

  const updateTemplate = async (id: string, updates: Partial<AssessmentTemplate>) => {
    setLoading(true);
    try {
      const updateData: any = {};
      if (updates.title) updateData.title = updates.title;
      if (updates.description) updateData.description = updates.description;
      if (updates.category) updateData.category = updates.category;
      if (updates.icon) updateData.icon = updates.icon;
      if (updates.estimated_time !== undefined) updateData.estimated_time = updates.estimated_time;
      if (updates.is_active !== undefined) updateData.is_active = updates.is_active;
      if (updates.is_public !== undefined) updateData.is_public = updates.is_public;
      if (updates.configuration) updateData.configuration = updates.configuration;

      const { data, error } = await supabase
        .from('assessment_templates')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Template updated',
        description: 'Assessment template has been updated successfully',
      });

      return { success: true, data: data as unknown as AssessmentTemplate };
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const deleteTemplate = async (id: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('assessment_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Template deleted',
        description: 'Assessment template has been deleted successfully',
      });

      return { success: true };
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    createTemplate,
    getTemplates,
    updateTemplate,
    deleteTemplate,
  };
};
