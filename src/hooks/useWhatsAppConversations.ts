import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { notify } from '@/lib/notify';
import { differenceInMinutes } from 'date-fns';

export interface SlaStatus {
  level: 'critical' | 'overdue' | 'warning' | 'attention' | null;
  label: string;
  color: string;
  waitMinutes: number;
}

export interface WhatsAppConversation {
  id: string;
  account_id: string;
  candidate_id: string | null;
  candidate_phone: string;
  candidate_name: string | null;
  profile_picture_url: string | null;
  conversation_status: string;
  messaging_window_expires_at: string | null;
  assigned_strategist_id: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  last_message_direction: string | null;
  unread_count: number;
  is_pinned: boolean;
  tags: string[];
  created_at: string;
  // Computed SLA fields
  slaStatus?: SlaStatus | null;
}

export function getSlaStatus(lastMessageAt: string | null, direction: string | null): SlaStatus | null {
  if (direction !== 'inbound' || !lastMessageAt) return null;
  
  const waitMinutes = differenceInMinutes(new Date(), new Date(lastMessageAt));
  
  if (waitMinutes > 240) {
    return { level: 'critical', label: '4h+ overdue', color: 'bg-red-600', waitMinutes };
  }
  if (waitMinutes > 120) {
    return { level: 'overdue', label: `${Math.floor(waitMinutes / 60)}h waiting`, color: 'bg-red-500', waitMinutes };
  }
  if (waitMinutes > 60) {
    return { level: 'warning', label: `${waitMinutes}m waiting`, color: 'bg-amber-500', waitMinutes };
  }
  if (waitMinutes > 30) {
    return { level: 'attention', label: `${waitMinutes}m`, color: 'bg-yellow-500', waitMinutes };
  }
  return null;
}

export function useWhatsAppConversations() {
  const [rawConversations, setRawConversations] = useState<WhatsAppConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState(0);

  const fetchConversations = useCallback(async () => {
    // Throttle: max once per 2 seconds
    const now = Date.now();
    if (now - lastFetch < 2000) return;
    setLastFetch(now);

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .select('*')
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (error) throw error;
      setRawConversations(data || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      notify.error('Error', { description: 'Failed to load conversations' });
    } finally {
      setLoading(false);
    }
  }, [lastFetch]);

  // Compute SLA status for each conversation
  const conversations = useMemo(() => {
    return rawConversations.map(c => ({
      ...c,
      slaStatus: getSlaStatus(c.last_message_at, c.last_message_direction)
    }));
  }, [rawConversations]);

  // Derived: conversations needing response sorted by urgency
  const needsResponse = useMemo(() => {
    return conversations
      .filter(c => c.last_message_direction === 'inbound' && c.unread_count > 0)
      .sort((a, b) => {
        const aWait = a.slaStatus?.waitMinutes || 0;
        const bWait = b.slaStatus?.waitMinutes || 0;
        return bWait - aWait; // Longest wait first
      });
  }, [conversations]);

  const markAsRead = async (conversationId: string) => {
    const { error } = await supabase
      .from('whatsapp_conversations')
      .update({ unread_count: 0 })
      .eq('id', conversationId);

    if (!error) {
      setRawConversations(prev =>
        prev.map(c => c.id === conversationId ? { ...c, unread_count: 0 } : c)
      );
    }
  };

  const assignStrategist = async (conversationId: string, strategistId: string) => {
    const { error } = await supabase
      .from('whatsapp_conversations')
      .update({ assigned_strategist_id: strategistId })
      .eq('id', conversationId);

    if (error) {
      notify.error('Error', { description: 'Failed to assign strategist' });
    } else {
      await fetchConversations();
    }
  };

  useEffect(() => {
    fetchConversations();

    const channel = supabase
      .channel('whatsapp_conversations_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_conversations' }, () => {
        fetchConversations();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return { 
    conversations, 
    needsResponse,
    loading, 
    refetch: fetchConversations, 
    markAsRead, 
    assignStrategist 
  };
}
