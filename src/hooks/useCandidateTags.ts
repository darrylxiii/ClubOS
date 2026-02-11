import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TagDefinition {
  id: string;
  name: string;
  category: string;
  color: string;
  description: string | null;
  is_system: boolean;
}

export interface TagAssignment {
  id: string;
  candidate_id: string;
  tag_id: string;
  assigned_by: string | null;
  assigned_at: string;
  tag: TagDefinition;
}

export function useCandidateTags(candidateId?: string) {
  const [allTags, setAllTags] = useState<TagDefinition[]>([]);
  const [assignedTags, setAssignedTags] = useState<TagAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAllTags = useCallback(async () => {
    const { data, error } = await (supabase as any)
      .from('candidate_tag_definitions')
      .select('*')
      .order('category')
      .order('name');
    if (!error && data) setAllTags(data);
  }, []);

  const loadAssignedTags = useCallback(async () => {
    if (!candidateId) return;
    const { data, error } = await (supabase as any)
      .from('candidate_tag_assignments')
      .select('*, tag:candidate_tag_definitions(*)')
      .eq('candidate_id', candidateId);
    if (!error && data) setAssignedTags(data);
  }, [candidateId]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([loadAllTags(), loadAssignedTags()]);
      setLoading(false);
    };
    load();
  }, [loadAllTags, loadAssignedTags]);

  const assignTag = async (tagId: string) => {
    if (!candidateId) return;
    const { error } = await (supabase as any)
      .from('candidate_tag_assignments')
      .insert({ candidate_id: candidateId, tag_id: tagId });
    if (error) {
      if (error.code === '23505') {
        toast.info('Tag already assigned');
      } else {
        toast.error('Failed to assign tag');
      }
      return;
    }
    await loadAssignedTags();
  };

  const removeTag = async (tagId: string) => {
    if (!candidateId) return;
    const { error } = await (supabase as any)
      .from('candidate_tag_assignments')
      .delete()
      .eq('candidate_id', candidateId)
      .eq('tag_id', tagId);
    if (error) {
      toast.error('Failed to remove tag');
      return;
    }
    await loadAssignedTags();
  };

  const createTag = async (name: string, category: string, color: string) => {
    const { data, error } = await (supabase as any)
      .from('candidate_tag_definitions')
      .insert({ name, category, color })
      .select()
      .single();
    if (error) {
      toast.error('Failed to create tag');
      return null;
    }
    await loadAllTags();
    return data as TagDefinition;
  };

  const assignedTagIds = new Set(assignedTags.map(a => a.tag_id));
  const availableTags = allTags.filter(t => !assignedTagIds.has(t.id));

  const tagsByCategory = availableTags.reduce<Record<string, TagDefinition[]>>((acc, tag) => {
    if (!acc[tag.category]) acc[tag.category] = [];
    acc[tag.category].push(tag);
    return acc;
  }, {});

  return {
    allTags,
    assignedTags,
    availableTags,
    tagsByCategory,
    loading,
    assignTag,
    removeTag,
    createTag,
    refresh: () => Promise.all([loadAllTags(), loadAssignedTags()]),
  };
}
