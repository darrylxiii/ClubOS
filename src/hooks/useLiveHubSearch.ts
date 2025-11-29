import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SearchResult {
  id: string;
  type: 'message' | 'user' | 'channel';
  title: string;
  subtitle?: string;
  avatar?: string;
  timestamp?: string;
  channelId?: string;
}

export function useLiveHubSearch() {
  const { user } = useAuth();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (query: string) => {
    if (!user || query.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);

    try {
      const searchQuery = query.toLowerCase();

      // Search messages
      const { data: messages } = await supabase
        .from('live_channel_messages')
        .select(`
          id,
          content,
          created_at,
          channel_id,
          user_id,
          profiles!user_id(full_name, avatar_url),
          live_channels!channel_id(name)
        `)
        .textSearch('content', searchQuery)
        .limit(10);

      // Search users
      const { data: users } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .ilike('full_name', `%${searchQuery}%`)
        .limit(10);

      // Search channels
      const { data: channels } = await supabase
        .from('live_channels')
        .select('id, name, channel_type')
        .ilike('name', `%${searchQuery}%`)
        .limit(10);

      const allResults: SearchResult[] = [
        ...(messages || []).map((msg: any) => ({
          id: msg.id,
          type: 'message' as const,
          title: msg.content.substring(0, 100),
          subtitle: `in #${msg.live_channels?.name} by ${msg.profiles?.full_name}`,
          timestamp: msg.created_at,
          channelId: msg.channel_id,
        })),
        ...(users || []).map((u) => ({
          id: u.id,
          type: 'user' as const,
          title: u.full_name || 'Unknown User',
          avatar: u.avatar_url || undefined,
        })),
        ...(channels || []).map((ch) => ({
          id: ch.id,
          type: 'channel' as const,
          title: `#${ch.name}`,
          subtitle: ch.channel_type,
        })),
      ];

      setResults(allResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  return { results, loading, search };
}
