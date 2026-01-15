import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface AISuggestion {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  suggestion_type: string;
  action_data: any;
  created_at: string;
  shown?: boolean;
}

export function useAISuggestions() {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      loadSuggestions();

      // Subscribe to new suggestions
      const channel = supabase
        .channel('ai-suggestions')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'ai_suggestions',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            loadSuggestions();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const loadSuggestions = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('ai_suggestions')
        .select('*')
        .eq('user_id', user.id)
        .eq('dismissed', false)
        .or('expires_at.is.null,expires_at.gt.now()')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mappedSuggestions: AISuggestion[] = (data || []).map(s => ({
        id: s.id,
        title: s.title,
        description: s.description || '',
        priority: s.priority as 'low' | 'medium' | 'high' | 'urgent',
        suggestion_type: s.suggestion_type,
        action_data: s.action_data,
        created_at: s.created_at || new Date().toISOString(),
        shown: s.shown || false
      }));

      setSuggestions(mappedSuggestions);
      setUnreadCount(mappedSuggestions.filter(s => !s.shown).length);
    } catch (error) {
      console.error('Error loading suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const dismissSuggestion = async (suggestionId: string) => {
    try {
      await supabase
        .from('ai_suggestions')
        .update({ dismissed: true, shown: true })
        .eq('id', suggestionId);

      await loadSuggestions();
    } catch (error) {
      console.error('Error dismissing suggestion:', error);
    }
  };

  const markAsShown = async (suggestionId: string) => {
    try {
      await supabase
        .from('ai_suggestions')
        .update({ shown: true })
        .eq('id', suggestionId);

      await loadSuggestions();
    } catch (error) {
      console.error('Error marking suggestion as shown:', error);
    }
  };

  const markAsActedUpon = async (suggestionId: string) => {
    try {
      await supabase
        .from('ai_suggestions')
        .update({ acted_upon: true, shown: true })
        .eq('id', suggestionId);

      await loadSuggestions();
    } catch (error) {
      console.error('Error marking suggestion as acted upon:', error);
    }
  };

  return {
    suggestions,
    loading,
    unreadCount,
    dismissSuggestion,
    markAsShown,
    markAsActedUpon,
    refresh: loadSuggestions
  };
}
